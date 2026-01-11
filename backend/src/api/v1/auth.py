"""Auth routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.schemas import APIModel
from src.auth.dependencies import get_current_user
from src.auth.security import create_access_token, hash_password, hash_refresh_token, verify_password
from src.auth.service import (
    create_oauth_identity,
    create_refresh_session,
    create_user,
    deactivate_user_account,
    get_oauth_identity,
    get_refresh_session,
    get_user_by_email,
    get_user_by_id,
    normalize_email,
    revoke_refresh_session,
    validate_email,
    verify_google_id_token,
)
from src.config import get_settings
from src.database import get_session
from src.models.enums import OAuthProvider
from src.models.user import User

class UserOut(APIModel):
    id: str
    email: str
    has_password: bool


class AuthResponse(APIModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(APIModel):
    email: str
    password: str


class LoginRequest(APIModel):
    email: str
    password: str


class GoogleLoginRequest(APIModel):
    id_token: str


class RefreshRequest(APIModel):
    refresh_token: str


class LogoutRequest(APIModel):
    refresh_token: str


class DeleteAccountRequest(APIModel):
    password: str | None = None


def user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        has_password=bool(user.password_hash),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest = Body(...),
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    email = normalize_email(payload.email)
    if not validate_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    existing = await get_user_by_email(session, email=email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = await create_user(
        session,
        email=email,
        password_hash=hash_password(payload.password),
    )
    settings = get_settings()
    access_token, expires_in = create_access_token(user_id=user.id, settings=settings)
    refresh_token, _ = await create_refresh_session(session, user_id=user.id, settings=settings)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest = Body(...),
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    user = await get_user_by_email(session, email=payload.email)
    if not user or not user.password_hash or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    settings = get_settings()
    access_token, expires_in = create_access_token(user_id=user.id, settings=settings)
    refresh_token, _ = await create_refresh_session(session, user_id=user.id, settings=settings)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post("/google", response_model=AuthResponse)
async def google_login(
    payload: GoogleLoginRequest = Body(...),
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    settings = get_settings()
    if not settings.google_client_ids:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google login is not configured",
        )
    try:
        provider_user_id, email = await verify_google_id_token(
            id_token=payload.id_token,
            settings=settings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    identity = await get_oauth_identity(
        session,
        provider=OAuthProvider.google,
        provider_user_id=provider_user_id,
    )
    if identity:
        user = await get_user_by_id(session, user_id=identity.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    else:
        user = await get_user_by_email(session, email=email)
        if not user:
            user = await create_user(session, email=email, password_hash=None)
        elif not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        await create_oauth_identity(
            session,
            user_id=user.id,
            provider=OAuthProvider.google,
            provider_user_id=provider_user_id,
            email=email,
        )

    access_token, expires_in = create_access_token(user_id=user.id, settings=settings)
    refresh_token, _ = await create_refresh_session(session, user_id=user.id, settings=settings)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    payload: RefreshRequest = Body(...),
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    settings = get_settings()
    token_hash = hash_refresh_token(payload.refresh_token)
    auth_session = await get_refresh_session(session, token_hash=token_hash)
    if not auth_session or auth_session.revoked_at or auth_session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    await revoke_refresh_session(session, auth_session=auth_session)
    refresh_token, _ = await create_refresh_session(session, user_id=auth_session.user_id, settings=settings)
    access_token, expires_in = create_access_token(user_id=auth_session.user_id, settings=settings)
    user = await get_user_by_id(session, user_id=auth_session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest = Body(...),
    session: AsyncSession = Depends(get_session),
) -> None:
    token_hash = hash_refresh_token(payload.refresh_token)
    auth_session = await get_refresh_session(session, token_hash=token_hash)
    if auth_session and not auth_session.revoked_at:
        await revoke_refresh_session(session, auth_session=auth_session)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return user_out(current_user)


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    payload: DeleteAccountRequest | None = Body(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.password_hash:
        password = payload.password if payload else None
        if not password or not verify_password(password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
    await deactivate_user_account(session, user=current_user)
