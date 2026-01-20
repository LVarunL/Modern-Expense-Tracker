"""API schemas for v1."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Annotated, Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator
from pydantic.functional_serializers import PlainSerializer

from src.analytics.types import AnalyticsBucket
from src.models.enums import EntrySource, EntryStatus, TransactionDirection, TransactionType


class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_encoders={Decimal: lambda value: float(value)},
    )


def _coerce_epoch_datetime(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        seconds = value / 1000 if value > 1_000_000_000_000 else value
        return datetime.fromtimestamp(seconds, tz=timezone.utc)
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.isdigit():
            seconds = int(stripped)
            if seconds > 1_000_000_000_000:
                seconds /= 1000
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
    return value


def _serialize_epoch_ms(value: datetime) -> int:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.timestamp() * 1000)


EpochDateTime = Annotated[
    datetime,
    BeforeValidator(_coerce_epoch_datetime),
    PlainSerializer(_serialize_epoch_ms, return_type=int),
]


TItem = TypeVar("TItem")


class PaginatedResponse(APIModel, Generic[TItem]):
    items: list[TItem]
    total_count: int
    limit: int
    offset: int


class ParseRequest(APIModel):
    raw_text: str = Field(min_length=1)
    reference_datetime: EpochDateTime | None = None


class ParseTransaction(APIModel):
    amount: Decimal
    currency: str = "INR"
    direction: TransactionDirection
    type: TransactionType
    category: str
    assumptions: list[str] = Field(default_factory=list)


class ParsePreview(APIModel):
    entry_summary: str | None = None
    occurred_time: EpochDateTime | None = Field(
        default=None,
        validation_alias="occurred_at",
    )
    transactions: list[ParseTransaction] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class ParseResponse(ParsePreview):
    entry_id: int
    status: EntryStatus


class TransactionInput(APIModel):
    occurred_time: EpochDateTime = Field(validation_alias="occurred_at")
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
    created_time: EpochDateTime = Field(validation_alias="created_at")
    modified_time: EpochDateTime = Field(validation_alias="updated_at")
    parser_output_json: dict[str, Any] | None
    parser_version: str | None
    notes: str | None


class TransactionOut(APIModel):
    id: int
    entry_id: int
    occurred_time: EpochDateTime = Field(validation_alias="occurred_at")
    created_time: EpochDateTime = Field(validation_alias="created_at")
    modified_time: EpochDateTime = Field(validation_alias="updated_at")
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


class AnalyticsSeriesPoint(APIModel):
    bucket_start: EpochDateTime
    total: Decimal
    transaction_count: int


class AnalyticsSeriesResponse(APIModel):
    bucket: AnalyticsBucket
    items: list[AnalyticsSeriesPoint]


class AnalyticsCategoryPoint(APIModel):
    direction: TransactionDirection
    category: str
    total: Decimal
    transaction_count: int


class AnalyticsCategoryResponse(APIModel):
    items: list[AnalyticsCategoryPoint]


class AnalyticsTypePoint(APIModel):
    direction: TransactionDirection
    type: TransactionType
    total: Decimal
    transaction_count: int


class AnalyticsTypeResponse(APIModel):
    items: list[AnalyticsTypePoint]


class AnalyticsSummaryResponse(APIModel):
    total_inflow: Decimal
    total_outflow: Decimal
    net: Decimal
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


def epoch_range(
    from_ms: int | None,
    to_ms: int | None,
    from_date: date | None,
    to_date: date | None,
) -> tuple[datetime | None, datetime | None]:
    if from_ms is None and to_ms is None:
        return date_range(from_date, to_date)

    def to_datetime(value: int | None) -> datetime | None:
        if value is None:
            return None
        seconds = value / 1000 if value > 1_000_000_000_000 else value
        return datetime.fromtimestamp(seconds, tz=timezone.utc)

    return to_datetime(from_ms), to_datetime(to_ms)
