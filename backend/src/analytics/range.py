"""Range helpers for analytics."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class AnalyticsRange:
    start: datetime
    end: datetime


def _to_datetime(value_ms: int) -> datetime:
    seconds = value_ms / 1000 if value_ms > 1_000_000_000_000 else value_ms
    return datetime.fromtimestamp(seconds, tz=timezone.utc)


def normalize_epoch_range(from_ms: int | None, to_ms: int | None) -> AnalyticsRange:
    if from_ms is None or to_ms is None:
        raise ValueError("from_ms and to_ms are required")
    start = _to_datetime(from_ms)
    end = _to_datetime(to_ms)
    if start >= end:
        raise ValueError("from_ms must be earlier than to_ms")
    return AnalyticsRange(start=start, end=end)
