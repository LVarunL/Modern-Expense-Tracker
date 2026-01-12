from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from src.config import get_settings
from src.email.providers import (
    BrevoEmailProvider,
    EmailProvider,
    FileEmailProvider,
    NoopEmailProvider,
)
from src.email.types import EmailMessage

APP_NAME = "Expense Tracker"


class EmailService:
    def __init__(self, provider: EmailProvider, sender: str) -> None:
        self.provider = provider
        self.sender = sender

    async def send_signup_email(self, *, email: str) -> None:
        subject = f"Welcome to {APP_NAME}"
        text = (
            f"Hi {email},\n\n"
            f"Your {APP_NAME} account is ready. You can now sign in and sync your expenses.\n\n"
            "If this wasn't you, reply to this email and we'll help you secure the account.\n"
        )
        await self._send(email=email, subject=subject, text=text, tag="signup")

    async def send_login_email(
        self,
        *,
        email: str,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        details = []
        if client_ip:
            details.append(f"IP: {client_ip}")
        if user_agent:
            details.append(f"Device: {user_agent}")
        details_text = "\n".join(details) if details else "Device details unavailable."
        subject = f"New sign-in to {APP_NAME}"
        text = (
            f"Hi {email},\n\n"
            f"We detected a sign-in to your {APP_NAME} account on {timestamp}.\n"
            f"{details_text}\n\n"
            "If this wasn't you, reset your password or contact support.\n"
        )
        await self._send(email=email, subject=subject, text=text, tag="login")

    async def send_forgot_password_otp(
        self,
        *,
        email: str,
        otp: str,
        expires_minutes: int,
    ) -> None:
        subject = f"{APP_NAME} password reset code"
        text = (
            f"Hi {email},\n\n"
            f"Use this code to reset your {APP_NAME} password: {otp}\n"
            f"This code expires in {expires_minutes} minutes.\n\n"
            "If you didn't request this, you can ignore this email.\n"
        )
        await self._send(email=email, subject=subject, text=text, tag="forgot-password")

    async def send_reset_password_otp(
        self,
        *,
        email: str,
        otp: str,
        expires_minutes: int,
    ) -> None:
        subject = f"{APP_NAME} reset confirmation code"
        text = (
            f"Hi {email},\n\n"
            f"Confirm your new {APP_NAME} password with this code: {otp}\n"
            f"This code expires in {expires_minutes} minutes.\n\n"
            "If you didn't request this, contact support.\n"
        )
        await self._send(email=email, subject=subject, text=text, tag="reset-password")

    async def _send(self, *, email: str, subject: str, text: str, tag: str) -> None:
        message = EmailMessage(
            to=[email],
            subject=subject,
            text=text,
            sender=self.sender,
            tags={"event": tag},
        )
        await self.provider.send(message)


@lru_cache
def _build_email_service() -> EmailService:
    settings = get_settings()
    provider_name = settings.email_provider.lower()
    if provider_name == "file":
        provider = FileEmailProvider(
            directory=Path(settings.email_file_dir),
            default_sender=settings.email_from,
        )
    elif provider_name == "brevo":
        if not settings.brevo_api_key:
            raise RuntimeError("BREVO_API_KEY is not set")
        provider = BrevoEmailProvider(
            api_key=settings.brevo_api_key,
            base_url=settings.brevo_base_url,
            default_sender=settings.email_from,
            timeout_seconds=settings.brevo_timeout_seconds,
        )
    elif provider_name == "noop":
        provider = NoopEmailProvider()
    else:
        raise RuntimeError(f"Unsupported email provider: {settings.email_provider}")
    return EmailService(provider=provider, sender=settings.email_from)


def get_email_service() -> EmailService:
    return _build_email_service()
