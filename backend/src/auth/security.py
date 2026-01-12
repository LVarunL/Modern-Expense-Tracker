"""Authentication helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.config import Settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(
    *,
    user_id: uuid.UUID,
    settings: Settings,
) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_in = settings.access_token_minutes * 60
    payload = {
        "sub": str(user_id),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, expires_in


def decode_access_token(token: str, *, settings: Settings) -> uuid.UUID:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc
    subject = payload.get("sub")
    if not subject:
        raise ValueError("Access token missing subject")
    return uuid.UUID(subject)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_otp(length: int) -> str:
    maximum = 10**length
    return f"{secrets.randbelow(maximum):0{length}d}"


def hash_otp(otp: str, *, settings: Settings) -> str:
    payload = f"{settings.otp_secret}:{otp}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
