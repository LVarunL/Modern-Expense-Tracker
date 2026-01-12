"""Auth routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.schemas import APIModel
from src.auth.dependencies import get_current_user
from src.auth.security import (
    create_access_token,
    generate_otp,
    hash_otp,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.auth.service import (
    consume_auth_otp,
    create_auth_otp,
    create_oauth_identity,
    create_refresh_session,
    create_user,
    deactivate_user_account,
    get_oauth_identity,
    get_refresh_session,
    revoke_refresh_sessions,
    get_user_by_email,
    get_user_by_id,
    normalize_email,
    revoke_refresh_session,
    validate_email,
    verify_google_id_token,
)
from src.config import get_settings
from src.database import get_session
from src.email.service import EmailService, get_email_service
from src.models.enums import OAuthProvider, OtpPurpose
from src.models.user import User

logger = logging.getLogger(__name__)

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


class ForgotPasswordRequest(APIModel):
    email: str


class ForgotPasswordConfirmRequest(APIModel):
    email: str
    otp: str
    new_password: str


class ResetPasswordConfirmRequest(APIModel):
    otp: str
    new_password: str


class MessageResponse(APIModel):
    message: str


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
    email_service: EmailService = Depends(get_email_service),
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
    try:
        await email_service.send_signup_email(email=email)
    except Exception:
        logger.exception("Failed to send signup email", extra={"email": email})
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    payload: LoginRequest = Body(...),
    session: AsyncSession = Depends(get_session),
    email_service: EmailService = Depends(get_email_service),
) -> AuthResponse:
    user = await get_user_by_email(session, email=payload.email)
    if not user or not user.password_hash or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    settings = get_settings()
    access_token, expires_in = create_access_token(user_id=user.id, settings=settings)
    refresh_token, _ = await create_refresh_session(session, user_id=user.id, settings=settings)
    try:
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        await email_service.send_login_email(
            email=user.email,
            client_ip=client_ip,
            user_agent=user_agent,
        )
    except Exception:
        logger.exception("Failed to send login email", extra={"email": user.email})
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def forgot_password(
    payload: ForgotPasswordRequest = Body(...),
    session: AsyncSession = Depends(get_session),
    email_service: EmailService = Depends(get_email_service),
) -> MessageResponse:
    email = normalize_email(payload.email)
    if not validate_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")
    user = await get_user_by_email(session, email=email)
    if user and user.is_active:
        settings = get_settings()
        otp = generate_otp(settings.otp_length)
        otp_hash = hash_otp(otp, settings=settings)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.otp_expires_minutes
        )
        await create_auth_otp(
            session,
            user_id=user.id,
            email=user.email,
            purpose=OtpPurpose.forgot_password,
            otp_hash=otp_hash,
            expires_at=expires_at,
        )
        try:
            await email_service.send_forgot_password_otp(
                email=user.email,
                otp=otp,
                expires_minutes=settings.otp_expires_minutes,
            )
        except Exception:
            logger.exception("Failed to send forgot password OTP", extra={"email": email})
    return MessageResponse(message="If the email exists, a code has been sent.")


@router.post("/forgot-password/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password_confirm(
    payload: ForgotPasswordConfirmRequest = Body(...),
    session: AsyncSession = Depends(get_session),
) -> None:
    email = normalize_email(payload.email)
    if not validate_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    user = await get_user_by_email(session, email=email)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )
    settings = get_settings()
    otp_hash = hash_otp(payload.otp, settings=settings)
    otp = await consume_auth_otp(
        session,
        user_id=user.id,
        purpose=OtpPurpose.forgot_password,
        otp_hash=otp_hash,
        commit=False,
    )
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )
    try:
        user.password_hash = hash_password(payload.new_password)
        await revoke_refresh_sessions(session, user_id=user.id, commit=False)
        await session.commit()
    except Exception:
        await session.rollback()
        raise


@router.post("/google", response_model=AuthResponse)
async def google_login(
    request: Request,
    payload: GoogleLoginRequest = Body(...),
    session: AsyncSession = Depends(get_session),
    email_service: EmailService = Depends(get_email_service),
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
    is_new_user = False
    if identity:
        user = await get_user_by_id(session, user_id=identity.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    else:
        user = await get_user_by_email(session, email=email)
        if not user:
            user = await create_user(session, email=email, password_hash=None)
            is_new_user = True
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
    try:
        if is_new_user:
            await email_service.send_signup_email(email=user.email)
        else:
            client_ip = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            await email_service.send_login_email(
                email=user.email,
                client_ip=client_ip,
                user_agent=user_agent,
            )
    except Exception:
        logger.exception("Failed to send login email", extra={"email": user.email})
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_out(user),
    )


@router.post(
    "/reset-password/request",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def reset_password_request(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> MessageResponse:
    settings = get_settings()
    otp = generate_otp(settings.otp_length)
    otp_hash = hash_otp(otp, settings=settings)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.otp_expires_minutes
    )
    await create_auth_otp(
        session,
        user_id=current_user.id,
        email=current_user.email,
        purpose=OtpPurpose.reset_password,
        otp_hash=otp_hash,
        expires_at=expires_at,
    )
    try:
        await email_service.send_reset_password_otp(
            email=current_user.email,
            otp=otp,
            expires_minutes=settings.otp_expires_minutes,
        )
    except Exception:
        logger.exception(
            "Failed to send reset password OTP",
            extra={"email": current_user.email},
        )
    return MessageResponse(message="If the email exists, a code has been sent.")


@router.post("/reset-password/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password_confirm(
    payload: ResetPasswordConfirmRequest = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    settings = get_settings()
    otp_hash = hash_otp(payload.otp, settings=settings)
    otp = await consume_auth_otp(
        session,
        user_id=current_user.id,
        purpose=OtpPurpose.reset_password,
        otp_hash=otp_hash,
        commit=False,
    )
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )
    try:
        current_user.password_hash = hash_password(payload.new_password)
        await revoke_refresh_sessions(session, user_id=current_user.id, commit=False)
        await session.commit()
    except Exception:
        await session.rollback()
        raise


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
