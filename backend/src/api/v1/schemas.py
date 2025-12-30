"""API schemas for v1."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import EntrySource, EntryStatus, TransactionDirection, TransactionType


class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: lambda value: float(value)},
    )


class ParseRequest(APIModel):
    raw_text: str = Field(min_length=1)
    occurred_at_hint: datetime | None = None


class ParseTransaction(APIModel):
    amount: Decimal
    currency: str = "INR"
    direction: TransactionDirection
    type: TransactionType
    category: str
    subcategory: str | None = None
    merchant: str | None = None
    confidence: float = 0.0
    needs_confirmation: bool = False
    assumptions: list[str] = Field(default_factory=list)


class ParsePreview(APIModel):
    entry_summary: str | None = None
    occurred_at: datetime | None = None
    transactions: list[ParseTransaction] = Field(default_factory=list)
    overall_confidence: float = 0.0
    needs_confirmation: bool = True
    assumptions: list[str] = Field(default_factory=list)
    follow_up_question: str | None = None


class ParseResponse(ParsePreview):
    entry_id: int
    status: EntryStatus


class TransactionInput(APIModel):
    occurred_at: datetime
    amount: Decimal = Field(gt=0)
    currency: str = "INR"
    direction: TransactionDirection
    type: TransactionType
    category: str
    subcategory: str | None = None
    merchant: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_confirmation: bool = False
    assumptions: list[str] = Field(default_factory=list)


class ConfirmRequest(APIModel):
    entry_id: int
    transactions: list[TransactionInput] = Field(min_length=1)


class EntryOut(APIModel):
    id: int
    user_id: str
    raw_text: str
    source: EntrySource
    created_at: datetime
    occurred_at_hint: datetime | None
    parser_output_json: dict[str, Any] | None
    parser_version: str | None
    status: EntryStatus
    notes: str | None


class TransactionOut(APIModel):
    id: int
    entry_id: int
    occurred_at: datetime
    amount: Decimal
    currency: str
    direction: TransactionDirection
    type: TransactionType
    category: str
    subcategory: str | None
    merchant: str | None
    confidence: float
    needs_confirmation: bool
    assumptions_json: Any | None


class ConfirmResponse(APIModel):
    entry: EntryOut
    transactions: list[TransactionOut]


class TransactionsResponse(APIModel):
    items: list[TransactionOut]
    count: int


class CategorySummary(APIModel):
    direction: TransactionDirection
    category: str
    total: Decimal


class SummaryResponse(APIModel):
    month: str
    total_inflow: Decimal
    total_outflow: Decimal
    net: Decimal
    by_category: list[CategorySummary]


def month_range(month: str) -> tuple[datetime, datetime]:
    parsed = datetime.strptime(month, "%Y-%m")
    start = datetime(parsed.year, parsed.month, 1, tzinfo=timezone.utc)
    if parsed.month == 12:
        end = datetime(parsed.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(parsed.year, parsed.month + 1, 1, tzinfo=timezone.utc)
    return start, end


def date_range(
    from_date: date | None,
    to_date: date | None,
) -> tuple[datetime | None, datetime | None]:
    start = (
        datetime.combine(from_date, time.min, tzinfo=timezone.utc) if from_date else None
    )
    end = datetime.combine(to_date, time.max, tzinfo=timezone.utc) if to_date else None
    return start, end
