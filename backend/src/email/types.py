from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True, slots=True)
class EmailMessage:
    to: Sequence[str]
    subject: str
    text: str
    html: str | None = None
    sender: str | None = None
    tags: dict[str, str] | None = None
