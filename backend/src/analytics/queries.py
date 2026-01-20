"""Analytics query helpers."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.range import AnalyticsRange
from src.analytics.types import AnalyticsBucket
from src.models.entry import Entry
from src.models.enums import TransactionDirection
from src.models.transaction import Transaction
from src.services.filtering import FilterClause, apply_filters
from src.services.transaction_service import TRANSACTION_FILTER_FIELDS, TransactionField


def _base_filters(user_id, date_range: AnalyticsRange) -> list:
    return [
        Transaction.is_deleted.is_(False),
        Entry.user_id == user_id,
        Transaction.occurred_at >= date_range.start,
        Transaction.occurred_at < date_range.end,
    ]


def _apply_filter_clauses(query, filters: list[FilterClause[TransactionField]] | None):
    if filters:
        return apply_filters(query, filters=filters, fields=TRANSACTION_FILTER_FIELDS)
    return query


def _bucket_expression(bucket: AnalyticsBucket, tz: str):
    local_ts = func.timezone(tz, Transaction.occurred_at)
    truncated = func.date_trunc(bucket.value, local_ts)
    return func.timezone(tz, truncated)


def _bucket_start(
    bucket: AnalyticsBucket,
    occurred_at: datetime,
    tz: ZoneInfo,
) -> datetime:
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    local_dt = occurred_at.astimezone(tz)
    if bucket == AnalyticsBucket.day:
        start_local = datetime(
            local_dt.year,
            local_dt.month,
            local_dt.day,
            tzinfo=tz,
        )
    elif bucket == AnalyticsBucket.week:
        start_of_week = local_dt.date() - timedelta(days=local_dt.weekday())
        start_local = datetime(
            start_of_week.year,
            start_of_week.month,
            start_of_week.day,
            tzinfo=tz,
        )
    else:
        start_local = datetime(local_dt.year, local_dt.month, 1, tzinfo=tz)
    return start_local.astimezone(timezone.utc)


async def fetch_series(
    session: AsyncSession,
    *,
    user_id,
    date_range: AnalyticsRange,
    bucket: AnalyticsBucket,
    tz: str,
    filters: list[FilterClause[TransactionField]] | None = None,
) -> list[dict]:
    if session.bind and session.bind.dialect.name == "postgresql":
        bucket_expr = _bucket_expression(bucket, tz).label("bucket_start")
        query = (
            select(
                bucket_expr,
                func.coalesce(func.sum(Transaction.amount), 0).label("total"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Entry)
            .where(*_base_filters(user_id, date_range))
            .group_by(bucket_expr)
            .order_by(bucket_expr)
        )
        query = _apply_filter_clauses(query, filters)
        result = await session.execute(query)
        return [
            {
                "bucket_start": row.bucket_start,
                "total": row.total,
                "transaction_count": row.transaction_count,
            }
            for row in result.all()
        ]

    tzinfo = ZoneInfo(tz)
    query = select(Transaction).join(Entry).where(*_base_filters(user_id, date_range))
    query = _apply_filter_clauses(query, filters)
    result = await session.execute(query)
    transactions = list(result.scalars())
    grouped: dict[datetime, dict[str, Decimal | int]] = defaultdict(
        lambda: {"total": Decimal("0"), "transaction_count": 0}
    )
    for tx in transactions:
        bucket_start = _bucket_start(bucket, tx.occurred_at, tzinfo)
        grouped[bucket_start]["total"] = grouped[bucket_start]["total"] + tx.amount
        grouped[bucket_start]["transaction_count"] += 1
    return [
        {
            "bucket_start": bucket_start,
            "total": grouped[bucket_start]["total"],
            "transaction_count": grouped[bucket_start]["transaction_count"],
        }
        for bucket_start in sorted(grouped.keys())
    ]


async def fetch_category_totals(
    session: AsyncSession,
    *,
    user_id,
    date_range: AnalyticsRange,
    filters: list[FilterClause[TransactionField]] | None = None,
) -> list[dict]:
    if session.bind and session.bind.dialect.name == "postgresql":
        query = (
            select(
                Transaction.direction,
                Transaction.category,
                func.coalesce(func.sum(Transaction.amount), 0).label("total"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Entry)
            .where(*_base_filters(user_id, date_range))
            .group_by(Transaction.direction, Transaction.category)
            .order_by(Transaction.direction, Transaction.category)
        )
        query = _apply_filter_clauses(query, filters)
        result = await session.execute(query)
        return [
            {
                "direction": row.direction,
                "category": row.category,
                "total": row.total,
                "transaction_count": row.transaction_count,
            }
            for row in result.all()
        ]

    query = select(Transaction).join(Entry).where(*_base_filters(user_id, date_range))
    query = _apply_filter_clauses(query, filters)
    result = await session.execute(query)
    transactions = list(result.scalars())
    grouped: dict[tuple[TransactionDirection, str], dict[str, Decimal | int]] = defaultdict(
        lambda: {"total": Decimal("0"), "transaction_count": 0}
    )
    for tx in transactions:
        key = (tx.direction, tx.category)
        grouped[key]["total"] = grouped[key]["total"] + tx.amount
        grouped[key]["transaction_count"] += 1
    return [
        {
            "direction": key[0],
            "category": key[1],
            "total": grouped[key]["total"],
            "transaction_count": grouped[key]["transaction_count"],
        }
        for key in sorted(grouped.keys(), key=lambda item: (item[0].value, item[1]))
    ]


async def fetch_type_totals(
    session: AsyncSession,
    *,
    user_id,
    date_range: AnalyticsRange,
    filters: list[FilterClause[TransactionField]] | None = None,
) -> list[dict]:
    if session.bind and session.bind.dialect.name == "postgresql":
        query = (
            select(
                Transaction.direction,
                Transaction.type,
                func.coalesce(func.sum(Transaction.amount), 0).label("total"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Entry)
            .where(*_base_filters(user_id, date_range))
            .group_by(Transaction.direction, Transaction.type)
            .order_by(Transaction.direction, Transaction.type)
        )
        query = _apply_filter_clauses(query, filters)
        result = await session.execute(query)
        return [
            {
                "direction": row.direction,
                "type": row.type,
                "total": row.total,
                "transaction_count": row.transaction_count,
            }
            for row in result.all()
        ]

    query = select(Transaction).join(Entry).where(*_base_filters(user_id, date_range))
    query = _apply_filter_clauses(query, filters)
    result = await session.execute(query)
    transactions = list(result.scalars())
    grouped: dict[tuple[TransactionDirection, str], dict[str, Decimal | int]] = defaultdict(
        lambda: {"total": Decimal("0"), "transaction_count": 0}
    )
    for tx in transactions:
        key = (tx.direction, tx.type)
        grouped[key]["total"] = grouped[key]["total"] + tx.amount
        grouped[key]["transaction_count"] += 1
    return [
        {
            "direction": key[0],
            "type": key[1],
            "total": grouped[key]["total"],
            "transaction_count": grouped[key]["transaction_count"],
        }
        for key in sorted(
            grouped.keys(),
            key=lambda item: (item[0].value, item[1].value),
        )
    ]


async def fetch_summary(
    session: AsyncSession,
    *,
    user_id,
    date_range: AnalyticsRange,
    filters: list[FilterClause[TransactionField]] | None = None,
) -> dict:
    if session.bind and session.bind.dialect.name == "postgresql":
        query = (
            select(
                Transaction.direction,
                func.coalesce(func.sum(Transaction.amount), 0).label("total"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Entry)
            .where(*_base_filters(user_id, date_range))
            .group_by(Transaction.direction)
        )
        query = _apply_filter_clauses(query, filters)
        result = await session.execute(query)
        rows = result.all()
    else:
        query = select(Transaction).join(Entry).where(*_base_filters(user_id, date_range))
        query = _apply_filter_clauses(query, filters)
        result = await session.execute(query)
        transactions = list(result.scalars())
        rows = []
        grouped: dict[TransactionDirection, dict[str, Decimal | int]] = defaultdict(
            lambda: {"total": Decimal("0"), "transaction_count": 0}
        )
        for tx in transactions:
            grouped[tx.direction]["total"] = grouped[tx.direction]["total"] + tx.amount
            grouped[tx.direction]["transaction_count"] += 1
        for direction, summary in grouped.items():
            rows.append((direction, summary["total"], summary["transaction_count"]))

    totals = {TransactionDirection.inflow: Decimal("0"), TransactionDirection.outflow: Decimal("0")}
    count = 0
    for direction, total, tx_count in rows:
        totals[direction] = total
        count += int(tx_count)

    total_inflow = totals[TransactionDirection.inflow]
    total_outflow = totals[TransactionDirection.outflow]
    return {
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "net": total_inflow - total_outflow,
        "transaction_count": count,
    }
