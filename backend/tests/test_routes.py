from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from src.models.entry import Entry
from src.models.enums import EntryStatus, TransactionDirection, TransactionType
from src.models.transaction import Transaction
from src.parser.service import ParsedResult, ParserError, get_parser
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

    result = await db_session.execute(select(Entry))
    entry = result.scalar_one()
    assert entry.user_id == "test-user"
    assert entry.raw_text == payload["raw_text"]
    assert entry.status == EntryStatus.pending_confirmation
    assert entry.parser_output_json is not None
    assert entry.parser_output_json["post_processed"]["needs_confirmation"] is True


async def test_parse_requires_text(client) -> None:
    response = await client.post("/v1/parse", json={"raw_text": ""})
    assert response.status_code == 422


async def test_parse_auto_confirms_transactions(app, db_session) -> None:
    class AutoParser:
        async def parse(self, *, raw_text: str, reference_datetime):
            preview = {
                "entry_summary": f"Parsed: {raw_text}",
                "occurred_at": reference_datetime,
                "transactions": [
                    {
                        "amount": Decimal("250.00"),
                        "currency": "INR",
                        "direction": TransactionDirection.outflow,
                        "type": TransactionType.expense,
                        "category": "Food & Drinks",
                        "needs_confirmation": False,
                        "assumptions": [],
                    }
                ],
                "needs_confirmation": False,
                "assumptions": [],
            }
            return ParsedResult(
                preview=preview,
                raw_output={"mock": True},
                post_processed=preview,
                parser_version="test",
            )

    app.dependency_overrides[get_parser] = lambda: AutoParser()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as auto_client:
        response = await auto_client.post("/v1/parse", json={"raw_text": "Taxi 250"})
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == EntryStatus.confirmed.value

    result = await db_session.execute(select(Entry))
    entry = result.scalar_one()
    assert entry.status == EntryStatus.confirmed

    tx_result = await db_session.execute(select(Transaction))
    tx = tx_result.scalar_one()
    assert tx.amount == Decimal("250.00")
    assert tx.is_deleted is False


async def test_parse_handles_parser_failure(app) -> None:
    class ErrorParser:
        async def parse(self, *, raw_text: str, reference_datetime):
            raise ParserError("boom")

    app.dependency_overrides[get_parser] = lambda: ErrorParser()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as error_client:
        response = await error_client.post("/v1/parse", json={"raw_text": "Test"})
        assert response.status_code == 502


async def test_confirm_creates_transactions(client, db_session) -> None:
    parse_response = await client.post("/v1/parse", json={"raw_text": "Lunch 250"})
    entry_id = parse_response.json()["entry_id"]

    occurred_at = "2025-01-10T12:30:00+00:00"
    payload = {
        "entry_id": entry_id,
        "transactions": [
            {
                "occurred_time": occurred_at,
                "amount": 250,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "assumptions": [],
            }
        ],
    }

    response = await client.post("/v1/entries/confirm", json=payload)
    assert response.status_code == 201
    data = response.json()
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
                "occurred_time": "2025-01-10T19:30:00+00:00",
                "amount": 500,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "assumptions": [],
            }
        ],
    }

    second_payload = {
        "entry_id": entry_id,
        "transactions": [
            {
                "occurred_time": "2025-01-10T20:00:00+00:00",
                "amount": 650,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
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
                "occurred_time": "2025-01-10T12:30:00+00:00",
                "amount": 250,
                "currency": "INR",
                "direction": "outflow",
                "type": "expense",
                "category": "Food & Drinks",
                "assumptions": [],
            }
        ],
    }
    response = await client.post("/v1/entries/confirm", json=payload)
    assert response.status_code == 404


async def test_update_transaction_updates_fields(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(
            user_id="test-user",
            raw_text="Seed",
            status=EntryStatus.confirmed,
        ),
    )
    entry_id = entry.id
    transactions = await create_transactions(
        db_session,
        items=[
            TransactionCreate(
                entry_id=entry.id,
                occurred_at=datetime(2025, 1, 10, tzinfo=timezone.utc),
                amount=Decimal("400"),
                currency="INR",
                direction=TransactionDirection.outflow,
                type=TransactionType.expense,
                category="Food & Drinks",
            )
        ],
    )
    transaction = transactions[0]
    transaction_id = transaction.id
    original_occurred_at = transaction.occurred_at
    past_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
    entry.updated_at = past_time
    await db_session.commit()

    payload = {
        "amount": 900,
        "currency": "INR",
        "direction": "outflow",
        "type": "expense",
        "category": "Transport",
    }
    response = await client.patch(f"/v1/transactions/{transaction.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 900
    assert data["category"] == "Transport"

    db_session.expire_all()
    tx_result = await db_session.execute(select(Transaction).where(Transaction.id == transaction_id))
    updated_tx = tx_result.scalar_one()
    assert updated_tx.amount == Decimal("900.00")
    assert updated_tx.occurred_at == original_occurred_at

    entry_result = await db_session.execute(select(Entry).where(Entry.id == entry_id))
    updated_entry = entry_result.scalar_one()
    updated_time = updated_entry.updated_at
    if updated_time.tzinfo is None:
        updated_time = updated_time.replace(tzinfo=timezone.utc)
    assert updated_time > past_time


async def test_update_transaction_requires_confirmed_entry(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(
            user_id="test-user",
            raw_text="Pending",
            status=EntryStatus.pending_confirmation,
        ),
    )
    transactions = await create_transactions(
        db_session,
        items=[
            TransactionCreate(
                entry_id=entry.id,
                occurred_at=datetime(2025, 1, 10, tzinfo=timezone.utc),
                amount=Decimal("400"),
                currency="INR",
                direction=TransactionDirection.outflow,
                type=TransactionType.expense,
                category="Food & Drinks",
            )
        ],
    )
    payload = {
        "amount": 550,
        "currency": "INR",
        "direction": "outflow",
        "type": "expense",
        "category": "Food & Drinks",
    }
    response = await client.patch(f"/v1/transactions/{transactions[0].id}", json=payload)
    assert response.status_code == 409


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
    assert data["total_count"] == 2
    assert data["limit"] == 200
    assert data["offset"] == 0
    assert data["items"][0]["amount"] == 300
    assert data["items"][1]["amount"] == 200


async def test_list_transactions_supports_sorting(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Sort seed"),
    )
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 10, tzinfo=timezone.utc),
            amount=Decimal("500"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 9, tzinfo=timezone.utc),
            amount=Decimal("150"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 8, tzinfo=timezone.utc),
            amount=Decimal("900"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Shopping",
        ),
    ]
    await create_transactions(db_session, items=items)

    response = await client.get(
        "/v1/transactions",
        params={"sort_by": "amount", "sort_order": "asc"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["amount"] == 150
    assert data["items"][1]["amount"] == 500
    assert data["items"][2]["amount"] == 900


async def test_list_transactions_filters_by_direction_and_type(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Filter seed"),
    )
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 2, 1, tzinfo=timezone.utc),
            amount=Decimal("300"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 2, 2, tzinfo=timezone.utc),
            amount=Decimal("800"),
            currency="INR",
            direction=TransactionDirection.inflow,
            type=TransactionType.income,
            category="Income",
        ),
    ]
    await create_transactions(db_session, items=items)

    response = await client.get(
        "/v1/transactions",
        params={"direction": "inflow", "type": ["income"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert data["items"][0]["direction"] == "inflow"
    assert data["items"][0]["type"] == "income"


async def test_list_transactions_filters_by_category_and_amount(client, db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Filter seed"),
    )
    items = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 3, 1, tzinfo=timezone.utc),
            amount=Decimal("120"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 3, 2, tzinfo=timezone.utc),
            amount=Decimal("650"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 3, 3, tzinfo=timezone.utc),
            amount=Decimal("900"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
    ]
    await create_transactions(db_session, items=items)

    response = await client.get(
        "/v1/transactions",
        params={
            "category": ["Food & Drinks"],
            "min_amount": 500,
            "max_amount": 800,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert data["items"][0]["amount"] == 650
    assert data["items"][0]["category"] == "Food & Drinks"


async def test_list_transactions_rejects_invalid_sort(client) -> None:
    response = await client.get(
        "/v1/transactions",
        params={"sort_by": "invalid_field", "sort_order": "asc"},
    )
    assert response.status_code == 400


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
