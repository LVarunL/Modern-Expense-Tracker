"""API helpers for transaction filtering."""

from __future__ import annotations

from decimal import Decimal

from fastapi import Query

from src.models.enums import TransactionDirection, TransactionType
from src.services import FilterClause, FilterOperator
from src.services.transaction_service import TransactionField


def _normalize_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    normalized: list[str] = []
    for value in values:
        for item in value.split(","):
            item = item.strip()
            if item:
                normalized.append(item)
    return normalized


def get_transaction_filters(
    direction: TransactionDirection | None = Query(
        default=None,
        description="Filter by direction (inflow or outflow).",
        examples={"outflow": {"value": "outflow"}},
    ),
    types: list[TransactionType] | None = Query(
        default=None,
        alias="type",
        description="Filter by one or more transaction types.",
        examples={"expense": {"value": ["expense"]}},
    ),
    categories: list[str] | None = Query(
        default=None,
        alias="category",
        description="Filter by one or more categories.",
        examples={"food": {"value": ["Food & Drinks"]}},
    ),
    min_amount: Decimal | None = Query(
        default=None,
        ge=0,
        description="Filter by minimum amount (inclusive).",
        examples={"min": {"value": 200}},
    ),
    max_amount: Decimal | None = Query(
        default=None,
        ge=0,
        description="Filter by maximum amount (inclusive).",
        examples={"max": {"value": 2000}},
    ),
) -> list[FilterClause[TransactionField]]:
    clauses: list[FilterClause[TransactionField]] = []

    if direction is not None:
        clauses.append(
            FilterClause(
                field=TransactionField.direction,
                operator=FilterOperator.eq,
                value=direction,
            )
        )
    if types:
        clauses.append(
            FilterClause(
                field=TransactionField.type,
                operator=FilterOperator.in_,
                value=types,
            )
        )
    normalized_categories = _normalize_list(categories)
    if normalized_categories:
        clauses.append(
            FilterClause(
                field=TransactionField.category,
                operator=FilterOperator.in_,
                value=normalized_categories,
            )
        )
    if min_amount is not None:
        clauses.append(
            FilterClause(
                field=TransactionField.amount,
                operator=FilterOperator.gte,
                value=min_amount,
            )
        )
    if max_amount is not None:
        clauses.append(
            FilterClause(
                field=TransactionField.amount,
                operator=FilterOperator.lte,
                value=max_amount,
            )
        )
    return clauses
