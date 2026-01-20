from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from zoneinfo import ZoneInfo

from src.models.enums import TransactionDirection, TransactionType
from src.services import EntryCreate, TransactionCreate, create_entry, create_transactions

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def test_analytics_series_day_bucket(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id=TEST_USER_ID, raw_text="Seed"),
    )

    base_day = datetime(2025, 1, 10, tzinfo=timezone.utc)
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_day + timedelta(hours=2),
            amount=Decimal("100"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_day + timedelta(days=1, hours=3),
            amount=Decimal("250"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
    ]
    await create_transactions(db_session, items=items)

    from_ms = int(base_day.timestamp() * 1000)
    to_ms = int((base_day + timedelta(days=2)).timestamp() * 1000)
    response = await client.get(
        "/v1/analytics/series",
        params={"from_ms": from_ms, "to_ms": to_ms, "bucket": "day", "tz": "UTC"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bucket"] == "day"
    assert len(data["items"]) == 2
    assert data["items"][0]["bucket_start"] == from_ms
    assert data["items"][0]["total"] == 100
    assert data["items"][0]["transaction_count"] == 1
    assert data["items"][1]["bucket_start"] == int(
        (base_day + timedelta(days=1)).timestamp() * 1000
    )


async def test_analytics_summary_and_categories(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id=TEST_USER_ID, raw_text="Seed"),
    )
    base_day = datetime(2025, 1, 10, tzinfo=timezone.utc)
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_day + timedelta(hours=1),
            amount=Decimal("100"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_day + timedelta(hours=2),
            amount=Decimal("300"),
            currency="INR",
            direction=TransactionDirection.inflow,
            type=TransactionType.income,
            category="Income",
        ),
    ]
    await create_transactions(db_session, items=items)

    from_ms = int(base_day.timestamp() * 1000)
    to_ms = int((base_day + timedelta(days=1)).timestamp() * 1000)

    summary_response = await client.get(
        "/v1/analytics/summary",
        params={"from_ms": from_ms, "to_ms": to_ms},
    )
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_inflow"] == 300
    assert summary["total_outflow"] == 100
    assert summary["net"] == 200
    assert summary["transaction_count"] == 2

    categories_response = await client.get(
        "/v1/analytics/categories",
        params={"from_ms": from_ms, "to_ms": to_ms},
    )
    assert categories_response.status_code == 200
    categories = categories_response.json()["items"]
    assert len(categories) == 2
    totals = {item["category"]: item["total"] for item in categories}
    assert totals["Food & Drinks"] == 100
    assert totals["Income"] == 300

    types_response = await client.get(
        "/v1/analytics/types",
        params={"from_ms": from_ms, "to_ms": to_ms},
    )
    assert types_response.status_code == 200
    types = types_response.json()["items"]
    assert len(types) == 2
    type_totals = {item["type"]: item["total"] for item in types}
    assert type_totals["expense"] == 100
    assert type_totals["income"] == 300


async def test_analytics_series_tz_bucket(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id=TEST_USER_ID, raw_text="Seed"),
    )

    tz = ZoneInfo("Asia/Kolkata")
    early = datetime(2025, 1, 10, 0, 30, tzinfo=timezone.utc)
    late = datetime(2025, 1, 10, 23, 30, tzinfo=timezone.utc)
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=early,
            amount=Decimal("50"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=late,
            amount=Decimal("75"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
    ]
    await create_transactions(db_session, items=items)

    from_ms = int(datetime(2025, 1, 9, tzinfo=timezone.utc).timestamp() * 1000)
    to_ms = int(datetime(2025, 1, 12, tzinfo=timezone.utc).timestamp() * 1000)
    response = await client.get(
        "/v1/analytics/series",
        params={
            "from_ms": from_ms,
            "to_ms": to_ms,
            "bucket": "day",
            "tz": "Asia/Kolkata",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bucket"] == "day"
    assert len(data["items"]) == 2

    expected_first = int(
        datetime(2025, 1, 10, tzinfo=tz).astimezone(timezone.utc).timestamp()
        * 1000
    )
    expected_second = int(
        datetime(2025, 1, 11, tzinfo=tz).astimezone(timezone.utc).timestamp()
        * 1000
    )
    assert data["items"][0]["bucket_start"] == expected_first
    assert data["items"][1]["bucket_start"] == expected_second
