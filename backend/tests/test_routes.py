from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from src.models.entry import Entry
from src.models.enums import EntryStatus, TransactionDirection, TransactionType
from src.models.transaction import Transaction
from src.services import EntryCreate, TransactionCreate, create_entry, create_transactions


async def test_health_check(client) -> None:
    response = await client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_parse_creates_entry(client, db_session) -> None:
    payload = {"raw_text": "Dinner 600 and dessert 200"}
    response = await client.post("/v1/parse", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["entry_id"] > 0
    assert data["status"] == EntryStatus.pending_confirmation.value
    assert data["needs_confirmation"] is True

    result = await db_session.execute(select(Entry))
    entry = result.scalar_one()
    assert entry.user_id == "test-user"
    assert entry.raw_text == payload["raw_text"]
    assert entry.status == EntryStatus.pending_confirmation
    assert entry.parser_output_json is not None
    assert entry.parser_output_json["needs_confirmation"] is True


async def test_parse_requires_text(client) -> None:
    response = await client.post("/v1/parse", json={"raw_text": ""})
    assert response.status_code == 422


async def test_confirm_creates_transactions(client, db_session) -> None:
    parse_response = await client.post("/v1/parse", json={"raw_text": "Lunch 250"})
    entry_id = parse_response.json()["entry_id"]

    occurred_at = "2025-01-10T12:30:00+00:00"
    payload = {
        "entry_id": entry_id,
        "transactions": [
            {
                "occurred_at": occurred_at,
                "amount": 250,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "subcategory": "Dining",
                "merchant": "Cafe",
                "confidence": 0.9,
                "needs_confirmation": False,
                "assumptions": [],
            }
        ],
    }

    response = await client.post("/v1/entries/confirm", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["entry"]["status"] == EntryStatus.confirmed.value
    assert len(data["transactions"]) == 1

    result = await db_session.execute(select(Entry))
    entry = result.scalar_one()
    assert entry.status == EntryStatus.confirmed

    tx_result = await db_session.execute(select(Transaction))
    tx = tx_result.scalar_one()
    assert tx.amount == Decimal("250.00")
    assert tx.is_deleted is False


async def test_confirm_replaces_transactions(client, db_session) -> None:
    parse_response = await client.post("/v1/parse", json={"raw_text": "Dinner"})
    entry_id = parse_response.json()["entry_id"]

    first_payload = {
        "entry_id": entry_id,
        "transactions": [
            {
                "occurred_at": "2025-01-10T19:30:00+00:00",
                "amount": 500,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "subcategory": None,
                "merchant": None,
                "confidence": 0.7,
                "needs_confirmation": False,
                "assumptions": [],
            }
        ],
    }

    second_payload = {
        "entry_id": entry_id,
        "transactions": [
            {
                "occurred_at": "2025-01-10T20:00:00+00:00",
                "amount": 650,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "subcategory": None,
                "merchant": None,
                "confidence": 0.8,
                "needs_confirmation": False,
                "assumptions": [],
            }
        ],
    }

    assert (await client.post("/v1/entries/confirm", json=first_payload)).status_code == 201
    assert (await client.post("/v1/entries/confirm", json=second_payload)).status_code == 201

    tx_result = await db_session.execute(
        select(Transaction).where(Transaction.entry_id == entry_id).order_by(Transaction.id)
    )
    transactions = list(tx_result.scalars())
    assert len(transactions) == 2
    assert transactions[0].is_deleted is True
    assert transactions[1].is_deleted is False


async def test_confirm_requires_transactions(client) -> None:
    parse_response = await client.post("/v1/parse", json={"raw_text": "Lunch"})
    entry_id = parse_response.json()["entry_id"]
    response = await client.post("/v1/entries/confirm", json={"entry_id": entry_id, "transactions": []})
    assert response.status_code == 422


async def test_confirm_missing_entry(client) -> None:
    payload = {
        "entry_id": 9999,
        "transactions": [
            {
                "occurred_at": "2025-01-10T12:30:00+00:00",
                "amount": 250,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "subcategory": "Dining",
                "merchant": "Cafe",
                "confidence": 0.9,
                "needs_confirmation": False,
                "assumptions": [],
            }
        ],
    }
    response = await client.post("/v1/entries/confirm", json=payload)
    assert response.status_code == 404


async def test_list_transactions_filters_and_paginates(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Seed"),
    )

    base_time = datetime(2025, 1, 10, tzinfo=timezone.utc)
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_time - timedelta(days=2),
            amount=Decimal("100"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_time - timedelta(days=1),
            amount=Decimal("200"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=base_time,
            amount=Decimal("300"),
            currency="INR",
            direction=TransactionDirection.inflow,
            type=TransactionType.income,
            category="Income",
        ),
    ]
    await create_transactions(db_session, items=items)

    response = await client.get("/v1/transactions", params={"from": "2025-01-09", "to": "2025-01-10"})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert data["total_count"] == 2
    assert data["limit"] == 200
    assert data["offset"] == 0
    assert data["items"][0]["amount"] == 300
    assert data["items"][1]["amount"] == 200


async def test_summary_returns_totals_and_categories(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Seed"),
    )

    transactions = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 5, tzinfo=timezone.utc),
            amount=Decimal("5000"),
            currency="INR",
            direction=TransactionDirection.inflow,
            type=TransactionType.income,
            category="Income",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 6, tzinfo=timezone.utc),
            amount=Decimal("1200"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 2, 1, tzinfo=timezone.utc),
            amount=Decimal("800"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
    ]
    await create_transactions(db_session, items=transactions)

    response = await client.get("/v1/summary", params={"month": "2025-01"})
    assert response.status_code == 200
    data = response.json()
    assert data["total_inflow"] == 5000
    assert data["total_outflow"] == 1200
    assert data["net"] == 3800
    assert data["transaction_count"] == 2

    categories = {(item["direction"], item["category"]): item["total"] for item in data["by_category"]}
    assert categories[("inflow", "Income")] == 5000
    assert categories[("outflow", "Food & Drinks")] == 1200


async def test_summary_rejects_invalid_month(client) -> None:
    response = await client.get("/v1/summary", params={"month": "2025-13"})
    assert response.status_code == 400
