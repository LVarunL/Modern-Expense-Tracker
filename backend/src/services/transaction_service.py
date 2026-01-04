"""Transaction CRUD operations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from src.models.transaction import Transaction
from src.services.schemas import TransactionCreate


async def create_transactions(
    session: AsyncSession,
    *,
    items: list[TransactionCreate],
    commit: bool = True,
) -> list[Transaction]:
    transactions = [
        Transaction(
            entry_id=item.entry_id,
            occurred_at=item.occurred_at,
            amount=item.amount,
            currency=item.currency,
            direction=item.direction,
            type=item.type,
            category=item.category,
            assumptions_json=item.assumptions_json,
        )
        for item in items
    ]
    session.add_all(transactions)
    if commit:
        await session.commit()
        for transaction in transactions:
            await session.refresh(transaction)
    else:
        await session.flush()
    return transactions


async def list_transactions(
    session: AsyncSession,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[Transaction]:
    query = select(Transaction).where(Transaction.is_deleted.is_(False))
    if from_date:
        query = query.where(Transaction.occurred_at >= from_date)
    if to_date:
        query = query.where(Transaction.occurred_at <= to_date)
    query = query.order_by(Transaction.occurred_at.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars())


async def list_transactions_for_entry(
    session: AsyncSession,
    *,
    entry_id: int,
) -> list[Transaction]:
    query = select(Transaction).where(
        Transaction.entry_id == entry_id,
        Transaction.is_deleted.is_(False),
    )
    result = await session.execute(query)
    return list(result.scalars())


async def soft_delete_transactions_for_entry(
    session: AsyncSession,
    *,
    entry_id: int,
    commit: bool = True,
) -> None:
    await session.execute(
        Transaction.__table__.update()
        .where(Transaction.entry_id == entry_id)
        .values(is_deleted=True, updated_at=func.now())
    )
    if commit:
        await session.commit()
    else:
        await session.flush()
