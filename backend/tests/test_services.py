from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from src.models.enums import EntryStatus, TransactionDirection, TransactionType
from src.services import (
    EntryCreate,
    TransactionCreate,
    create_entry,
    create_transactions,
    list_entries,
    list_transactions,
    soft_delete_transactions_for_entry,
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
