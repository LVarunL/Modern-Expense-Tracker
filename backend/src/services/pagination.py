"""Service-layer pagination helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TypeVar

from sqlalchemy import Select
from sqlalchemy.ext.asyncio import AsyncSession

TItem = TypeVar("TItem")

DEFAULT_LIMIT = 200
MAX_LIMIT = 500


@dataclass(frozen=True, slots=True)
class PaginationParams:
    limit: int = DEFAULT_LIMIT
    offset: int = 0


async def paginate_query(
    session: AsyncSession,
    *,
    query: Select,
    count_query: Select,
    pagination: PaginationParams,
) -> tuple[list[TItem], int]:
    result = await session.execute(
        query.limit(pagination.limit).offset(pagination.offset)
    )
    items = list(result.scalars())
    total_count = await session.scalar(count_query)
    return items, int(total_count or 0)
