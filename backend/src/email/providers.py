from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from email.utils import parseaddr
from pathlib import Path
import uuid

import httpx

from src.email.types import EmailMessage


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, message: EmailMessage) -> None:
        raise NotImplementedError


class NoopEmailProvider(EmailProvider):
    async def send(self, message: EmailMessage) -> None:
        return None


class FileEmailProvider(EmailProvider):
    def __init__(self, directory: Path, default_sender: str | None = None) -> None:
        self.directory = directory
        self.default_sender = default_sender

    async def send(self, message: EmailMessage) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        filename = f"{timestamp}-{uuid.uuid4().hex}.txt"
        payload = self._format_payload(message)
        self.directory.joinpath(filename).write_text(payload, encoding="utf-8")

    def _format_payload(self, message: EmailMessage) -> str:
        sender = message.sender or self.default_sender or "no-reply@expense.local"
        to_line = ", ".join(message.to)
        lines = [
            f"From: {sender}",
            f"To: {to_line}",
            f"Subject: {message.subject}",
            "",
            message.text,
        ]
        if message.html:
            lines.extend(["", "--- HTML ---", message.html])
        return "\n".join(lines)


class BrevoEmailProvider(EmailProvider):
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        default_sender: str | None = None,
        timeout_seconds: float = 10.0,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_sender = default_sender
        self.timeout_seconds = timeout_seconds

    async def send(self, message: EmailMessage) -> None:
        sender_raw = message.sender or self.default_sender
        sender_name, sender_email = self._parse_address(sender_raw)
        if not sender_email:
            raise ValueError("Brevo sender email is required")

        payload: dict[str, object] = {
            "sender": {
                "email": sender_email,
                **({"name": sender_name} if sender_name else {}),
            },
            "to": [
                {
                    "email": email,
                    **({"name": name} if name else {}),
                }
                for name, email in self._parse_addresses(message.to)
                if email
            ],
            "subject": message.subject,
            "textContent": message.text,
        }
        if message.html:
            payload["htmlContent"] = message.html
        if message.tags:
            payload["tags"] = [f"{key}:{value}" for key, value in message.tags.items()]

        headers = {
            "api-key": self.api_key,
            "accept": "application/json",
            "content-type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(
                f"{self.base_url}/smtp/email",
                json=payload,
                headers=headers,
            )
        response.raise_for_status()

    @staticmethod
    def _parse_address(value: str | None) -> tuple[str | None, str | None]:
        if not value:
            return None, None
        name, email = parseaddr(value)
        return name or None, email or None

    def _parse_addresses(self, values: list[str]) -> list[tuple[str | None, str | None]]:
        return [self._parse_address(value) for value in values]
