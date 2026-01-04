"""Service-layer data structures."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from src.models.enums import EntrySource, EntryStatus, TransactionDirection, TransactionType


@dataclass(frozen=True, slots=True)
class EntryCreate:
    user_id: str
    raw_text: str
    source: EntrySource = EntrySource.manual_text
    parser_output_json: dict[str, Any] | None = None
    parser_version: str | None = None
    status: EntryStatus = EntryStatus.parsed
    notes: str | None = None


@dataclass(frozen=True, slots=True)
class TransactionCreate:
    entry_id: int
    occurred_at: datetime
    amount: Decimal
    currency: str
    direction: TransactionDirection
    type: TransactionType
    category: str
    assumptions_json: dict[str, Any] | list[str] | None = None
