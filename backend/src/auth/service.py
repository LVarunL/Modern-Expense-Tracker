"""Auth service helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
import uuid

import httpx
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.security import generate_refresh_token, hash_refresh_token
from src.config import Settings
from src.models.auth_otp import AuthOTP
from src.models.auth_session import AuthSession
from src.models.enums import OAuthProvider, OtpPurpose
from src.models.oauth_identity import OAuthIdentity
from src.models.user import User

EMAIL_RE = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))


async def get_user_by_id(session: AsyncSession, *, user_id: uuid.UUID) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(session: AsyncSession, *, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == normalize_email(email)))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password_hash: str | None,
    user_id: uuid.UUID | None = None,
) -> User:
    user = User(
        id=user_id or uuid.uuid4(),
        email=normalize_email(email),
        password_hash=password_hash,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_or_create_default_user(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> User:
    existing = await get_user_by_id(session, user_id=user_id)
    if existing:
        return existing
    email = f"demo+{user_id}@expense.local"
    return await create_user(session, email=email, password_hash=None, user_id=user_id)


async def get_oauth_identity(
    session: AsyncSession,
    *,
    provider: OAuthProvider,
    provider_user_id: str,
) -> OAuthIdentity | None:
    result = await session.execute(
        select(OAuthIdentity).where(
            OAuthIdentity.provider == provider,
            OAuthIdentity.provider_user_id == provider_user_id,
        )
    )
    return result.scalar_one_or_none()


async def create_oauth_identity(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    provider: OAuthProvider,
    provider_user_id: str,
    email: str,
) -> OAuthIdentity:
    identity = OAuthIdentity(
        user_id=user_id,
        provider=provider,
        provider_user_id=provider_user_id,
        email=normalize_email(email),
    )
    session.add(identity)
    await session.commit()
    await session.refresh(identity)
    return identity


async def create_refresh_session(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    settings: Settings,
) -> tuple[str, AuthSession]:
    token = generate_refresh_token()
    token_hash = hash_refresh_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
    auth_session = AuthSession(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    session.add(auth_session)
    await session.commit()
    await session.refresh(auth_session)
    return token, auth_session


async def get_refresh_session(
    session: AsyncSession,
    *,
    token_hash: str,
) -> AuthSession | None:
    result = await session.execute(
        select(AuthSession).where(AuthSession.token_hash == token_hash)
    )
    return result.scalar_one_or_none()


async def revoke_refresh_session(
    session: AsyncSession,
    *,
    auth_session: AuthSession,
) -> None:
    auth_session.revoked_at = datetime.now(timezone.utc)
    await session.commit()


async def revoke_refresh_sessions(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    commit: bool = True,
) -> None:
    await session.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
    if commit:
        await session.commit()


async def deactivate_user_account(
    session: AsyncSession,
    *,
    user: User,
) -> None:
    await session.execute(delete(OAuthIdentity).where(OAuthIdentity.user_id == user.id))
    await session.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    user.email = f"deleted+{user.id}@expense.local"
    user.password_hash = None
    user.is_active = False
    await session.commit()


async def create_auth_otp(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    email: str,
    purpose: OtpPurpose,
    otp_hash: str,
    expires_at: datetime,
) -> AuthOTP:
    now = datetime.now(timezone.utc)
    await session.execute(
        update(AuthOTP)
        .where(
            AuthOTP.user_id == user_id,
            AuthOTP.purpose == purpose,
            AuthOTP.used_at.is_(None),
        )
        .values(used_at=now)
    )
    otp = AuthOTP(
        user_id=user_id,
        email=normalize_email(email),
        purpose=purpose,
        otp_hash=otp_hash,
        expires_at=expires_at,
    )
    session.add(otp)
    await session.commit()
    await session.refresh(otp)
    return otp


async def consume_auth_otp(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    purpose: OtpPurpose,
    otp_hash: str,
    commit: bool = True,
) -> AuthOTP | None:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(AuthOTP)
        .where(
            AuthOTP.user_id == user_id,
            AuthOTP.purpose == purpose,
            AuthOTP.otp_hash == otp_hash,
            AuthOTP.used_at.is_(None),
            AuthOTP.expires_at > now,
        )
        .order_by(AuthOTP.created_at.desc())
    )
    otp = result.scalars().first()
    if not otp:
        return None
    otp.used_at = now
    if commit:
        await session.commit()
    return otp


async def verify_google_id_token(
    *,
    id_token: str,
    settings: Settings,
) -> tuple[str, str]:
    if not settings.google_client_ids:
        raise ValueError("Google login is not configured")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
    except httpx.HTTPError as exc:
        raise ValueError("Google verification failed") from exc
    if response.status_code != 200:
        raise ValueError("Invalid Google token")
    data = response.json()
    audience = data.get("aud")
    issuer = data.get("iss")
    if audience not in settings.google_client_ids:
        raise ValueError("Invalid Google audience")
    if issuer not in {"https://accounts.google.com", "accounts.google.com"}:
        raise ValueError("Invalid Google issuer")
    if data.get("email_verified") != "true":
        raise ValueError("Google email not verified")
    email = data.get("email")
    subject = data.get("sub")
    if not email or not subject:
        raise ValueError("Google token missing fields")
    return subject, email
