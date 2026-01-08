"""Transaction CRUD operations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from src.models.transaction import Transaction
from enum import Enum

from src.services.fields import FieldSpec, filterable_field_map, sortable_field_map
from src.services.filtering import FilterClause, apply_filters
from src.services.pagination import PaginationParams, paginate_query
from src.services.sorting import SortOrder, SortParams, apply_sort
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


class TransactionField(str, Enum):
    occurred_time = "occurred_time"
    amount = "amount"
    category = "category"
    type = "type"
    direction = "direction"


TRANSACTION_FIELDS = [
    FieldSpec(
        id=TransactionField.occurred_time,
        column=Transaction.occurred_at,
        sortable=True,
        filterable=True,
        label="Occurred time",
    ),
    FieldSpec(
        id=TransactionField.amount,
        column=Transaction.amount,
        sortable=True,
        filterable=True,
        label="Amount",
    ),
    FieldSpec(
        id=TransactionField.category,
        column=Transaction.category,
        sortable=True,
        filterable=True,
        label="Category",
    ),
    FieldSpec(
        id=TransactionField.type,
        column=Transaction.type,
        sortable=False,
        filterable=True,
        label="Type",
    ),
    FieldSpec(
        id=TransactionField.direction,
        column=Transaction.direction,
        sortable=False,
        filterable=True,
        label="Direction",
    ),
]

TRANSACTION_SORT_FIELDS = sortable_field_map(TRANSACTION_FIELDS)
TRANSACTION_FILTER_FIELDS = filterable_field_map(TRANSACTION_FIELDS)
TRANSACTION_DEFAULT_SORT = SortParams(
    field=TransactionField.occurred_time,
    order=SortOrder.desc,
)


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


def _normalize_transaction_sort(
    sort: SortParams[TransactionField] | None,
) -> SortParams[TransactionField]:
    if sort is None:
        return TRANSACTION_DEFAULT_SORT
    if sort.field not in TRANSACTION_SORT_FIELDS:
        allowed = ", ".join(
            field.value for field in sorted(TRANSACTION_SORT_FIELDS, key=lambda f: f.value)
        )
        raise ValueError(
            f"Unsupported sort field '{sort.field.value}'. Allowed: {allowed}."
        )
    return sort


def _normalize_transaction_filters(
    filters: list[FilterClause[TransactionField]] | None,
) -> list[FilterClause[TransactionField]]:
    return filters or []


async def list_transactions(
    session: AsyncSession,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    pagination: PaginationParams = PaginationParams(),
    sort: SortParams[TransactionField] | None = None,
    filters: list[FilterClause[TransactionField]] | None = None,
) -> list[Transaction]:
    items, _ = await list_transactions_paginated(
        session,
        from_date=from_date,
        to_date=to_date,
        pagination=pagination,
        sort=sort,
        filters=filters,
    )
    return items


async def list_transactions_paginated(
    session: AsyncSession,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    pagination: PaginationParams = PaginationParams(),
    sort: SortParams[TransactionField] | None = None,
    filters: list[FilterClause[TransactionField]] | None = None,
) -> tuple[list[Transaction], int]:
    base_filters = _transaction_filters(from_date=from_date, to_date=to_date)
    items_query = select(Transaction).where(*base_filters)
    count_query = select(func.count(Transaction.id)).where(*base_filters)
    transaction_filters = _normalize_transaction_filters(filters)
    if transaction_filters:
        items_query = apply_filters(
            items_query,
            filters=transaction_filters,
            fields=TRANSACTION_FILTER_FIELDS,
        )
        count_query = apply_filters(
            count_query,
            filters=transaction_filters,
            fields=TRANSACTION_FILTER_FIELDS,
        )
    sort_params = _normalize_transaction_sort(sort)
    items_query = apply_sort(
        items_query,
        sort=sort_params,
        fields=TRANSACTION_SORT_FIELDS,
    )
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
