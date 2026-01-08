from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from src.models.enums import EntryStatus, TransactionDirection, TransactionType
from src.services import (
    EntryCreate,
    PaginationParams,
    TransactionCreate,
    TransactionUpdate,
    create_entry,
    create_transactions,
    get_transaction,
    list_entries,
    list_transactions,
    list_transactions_paginated,
    soft_delete_transactions_for_entry,
    update_transaction,
    update_entry_status,
)


async def test_create_and_list_entries(db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Coffee"),
    )
    entries = await list_entries(db_session, user_id="test-user")
    assert len(entries) == 1
    assert entries[0].id == entry.id


async def test_update_entry_status(db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Groceries"),
    )
    updated = await update_entry_status(db_session, entry=entry, status=EntryStatus.confirmed)
    assert updated.status == EntryStatus.confirmed


async def test_create_list_and_soft_delete_transactions(db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Salary"),
    )
    transactions = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
            amount=Decimal("25000"),
            currency="INR",
            direction=TransactionDirection.inflow,
            type=TransactionType.income,
            category="Income",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 2, tzinfo=timezone.utc),
            amount=Decimal("1200"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
    ]
    await create_transactions(db_session, items=transactions)

    listed = await list_transactions(db_session)
    assert len(listed) == 2

    await soft_delete_transactions_for_entry(db_session, entry_id=entry.id)
    listed_after = await list_transactions(db_session)
    assert len(listed_after) == 0


async def test_list_transactions_paginated_returns_count(db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Paged"),
    )
    transactions = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 3, tzinfo=timezone.utc),
            amount=Decimal("100"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Food & Drinks",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 2, tzinfo=timezone.utc),
            amount=Decimal("200"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
            amount=Decimal("300"),
            currency="INR",
            direction=TransactionDirection.inflow,
            type=TransactionType.income,
            category="Income",
        ),
    ]
    await create_transactions(db_session, items=transactions)

    items, total = await list_transactions_paginated(
        db_session,
        pagination=PaginationParams(limit=2, offset=0),
    )
    assert total == 3
    assert len(items) == 2
    assert items[0].amount == Decimal("100.00")
    assert items[1].amount == Decimal("200.00")


async def test_update_transaction_fields(db_session) -> None:
    entry = await create_entry(
        db_session,
        entry=EntryCreate(user_id="test-user", raw_text="Edit"),
    )
    transactions = await create_transactions(
        db_session,
        items=[
            TransactionCreate(
                entry_id=entry.id,
                occurred_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
                amount=Decimal("800"),
                currency="INR",
                direction=TransactionDirection.outflow,
                type=TransactionType.expense,
                category="Food & Drinks",
            )
        ],
    )
    transaction = await get_transaction(db_session, transaction_id=transactions[0].id)
    assert transaction is not None

    updated = await update_transaction(
        db_session,
        transaction=transaction,
        update=TransactionUpdate(
            amount=Decimal("950"),
            currency="INR",
            direction=TransactionDirection.outflow,
            type=TransactionType.expense,
            category="Transport",
        ),
    )
    assert updated.amount == Decimal("950.00")
    assert updated.category == "Transport"
