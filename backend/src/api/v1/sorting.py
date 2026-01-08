"""API sorting helpers."""

from __future__ import annotations

from collections.abc import Callable
from enum import Enum
from typing import TypeVar

from fastapi import HTTPException, Query, status

from src.services.sorting import SortOrder, SortParams

TField = TypeVar("TField", bound=Enum)


def build_sort_dependency(
    *,
    sort_enum: type[TField],
    allowed_fields: list[TField],
    default_field: TField,
    default_order: SortOrder,
) -> Callable[[], SortParams[TField]]:
    allowed = ", ".join(field.value for field in allowed_fields)

    def _get_sort_params(
        sort_by: str | None = Query(
            default=None,
            description=f"Sort by one of: {allowed}.",
            examples={"default": {"value": default_field.value}},
        ),
        sort_order: SortOrder = Query(
            default=default_order,
            description="Sort order: asc or desc.",
            examples={"default": {"value": default_order.value}},
        ),
    ) -> SortParams[TField]:
        if sort_by is None:
            field = default_field
        else:
            try:
                field = sort_enum(sort_by)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported sort field '{sort_by}'. Allowed: {allowed}.",
                ) from exc
        if field not in allowed_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported sort field '{field.value}'. Allowed: {allowed}.",
            )
        return SortParams(field=field, order=sort_order)

    return _get_sort_params
