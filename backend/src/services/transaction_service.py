"""Transaction CRUD operations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from src.models.transaction import Transaction
from src.services.pagination import PaginationParams, paginate_query
from src.services.schemas import TransactionCreate, TransactionUpdate


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


def _transaction_filters(
    *,
    from_date: datetime | None,
    to_date: datetime | None,
) -> list:
    filters = [Transaction.is_deleted.is_(False)]
    if from_date:
        filters.append(Transaction.occurred_at >= from_date)
    if to_date:
        filters.append(Transaction.occurred_at <= to_date)
    return filters


async def list_transactions(
    session: AsyncSession,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    pagination: PaginationParams = PaginationParams(),
) -> list[Transaction]:
    items, _ = await list_transactions_paginated(
        session,
        from_date=from_date,
        to_date=to_date,
        pagination=pagination,
    )
    return items


async def list_transactions_paginated(
    session: AsyncSession,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    pagination: PaginationParams = PaginationParams(),
) -> tuple[list[Transaction], int]:
    filters = _transaction_filters(from_date=from_date, to_date=to_date)
    items_query = (
        select(Transaction)
        .where(*filters)
        .order_by(Transaction.occurred_at.desc())
    )
    count_query = select(func.count(Transaction.id)).where(*filters)
    return await paginate_query(
        session,
        query=items_query,
        count_query=count_query,
        pagination=pagination,
    )


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


async def get_transaction(
    session: AsyncSession,
    *,
    transaction_id: int,
) -> Transaction | None:
    result = await session.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.is_deleted.is_(False),
        )
    )
    return result.scalar_one_or_none()


async def update_transaction(
    session: AsyncSession,
    *,
    transaction: Transaction,
    update: TransactionUpdate,
    commit: bool = True,
) -> Transaction:
    transaction.amount = update.amount
    transaction.currency = update.currency
    transaction.direction = update.direction
    transaction.type = update.type
    transaction.category = update.category
    if commit:
        await session.commit()
        await session.refresh(transaction)
    else:
        await session.flush()
    return transaction


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
