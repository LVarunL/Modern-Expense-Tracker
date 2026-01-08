"""API schemas for v1."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import EntrySource, EntryStatus, TransactionDirection, TransactionType


class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_encoders={Decimal: lambda value: float(value)},
    )


TItem = TypeVar("TItem")


class PaginatedResponse(APIModel, Generic[TItem]):
    items: list[TItem]
    total_count: int
    limit: int
    offset: int


class ParseRequest(APIModel):
    raw_text: str = Field(min_length=1)
    reference_datetime: datetime | None = None


class ParseTransaction(APIModel):
    amount: Decimal
    currency: str = "INR"
    direction: TransactionDirection
    type: TransactionType
    category: str
    assumptions: list[str] = Field(default_factory=list)


class ParsePreview(APIModel):
    entry_summary: str | None = None
    occurred_time: datetime | None = Field(default=None, validation_alias="occurred_at")
    transactions: list[ParseTransaction] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class ParseResponse(ParsePreview):
    entry_id: int
    status: EntryStatus


class TransactionInput(APIModel):
    occurred_time: datetime = Field(validation_alias="occurred_at")
    amount: Decimal = Field(gt=0)
    currency: str = "INR"
    direction: TransactionDirection
    type: TransactionType
    category: str
    assumptions: list[str] = Field(default_factory=list)


class ConfirmRequest(APIModel):
    entry_id: int
    transactions: list[TransactionInput] = Field(min_length=1)


class EntryOut(APIModel):
    id: int
    raw_text: str
    source: EntrySource
    created_time: datetime = Field(validation_alias="created_at")
    modified_time: datetime = Field(validation_alias="updated_at")
    parser_output_json: dict[str, Any] | None
    parser_version: str | None
    notes: str | None


class TransactionOut(APIModel):
    id: int
    entry_id: int
    occurred_time: datetime = Field(validation_alias="occurred_at")
    created_time: datetime = Field(validation_alias="created_at")
    modified_time: datetime = Field(validation_alias="updated_at")
    amount: Decimal
    currency: str
    direction: TransactionDirection
    type: TransactionType
    category: str
    assumptions_json: Any | None


class ConfirmResponse(APIModel):
    entry: EntryOut
    transactions: list[TransactionOut]


class TransactionUpdateRequest(APIModel):
    amount: Decimal = Field(gt=0)
    currency: str = "INR"
    direction: TransactionDirection
    type: TransactionType
    category: str


class TransactionsResponse(PaginatedResponse[TransactionOut]):
    pass


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
    transaction_count: int


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
