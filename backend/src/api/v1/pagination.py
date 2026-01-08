"""Shared pagination parameters for list endpoints."""

from __future__ import annotations

from typing import TypeVar

from fastapi import Query

from src.services.pagination import DEFAULT_LIMIT, MAX_LIMIT, PaginationParams

TItem = TypeVar("TItem")


def get_pagination(
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
) -> PaginationParams:
    return PaginationParams(limit=limit, offset=offset)


def build_paginated_response(
    *,
    items: list[TItem],
    total_count: int,
    pagination: PaginationParams,
) -> dict[str, object]:
    return {
        "items": items,
        "total_count": total_count,
        "limit": pagination.limit,
        "offset": pagination.offset,
    }
