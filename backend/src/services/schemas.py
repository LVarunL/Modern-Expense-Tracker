"""Service-layer data structures."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from src.models.enums import TransactionDirection, TransactionType


@dataclass(frozen=True, slots=True)
class TransactionCreate:
    entry_id: int
    occurred_at: datetime
    amount: Decimal
    currency: str
    direction: TransactionDirection
    type: TransactionType
    category: str
    subcategory: str | None = None
    merchant: str | None = None
    confidence: float = 0.0
    needs_confirmation: bool = False
    assumptions_json: dict[str, Any] | None = None
