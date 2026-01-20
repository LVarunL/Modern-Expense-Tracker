"""Analytics types."""

from __future__ import annotations

from enum import Enum


class AnalyticsBucket(str, Enum):
    day = "day"
    week = "week"
    month = "month"
