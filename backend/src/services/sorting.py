"""Service-layer sorting helpers."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Generic, TypeVar

from sqlalchemy import Select
from sqlalchemy.sql.elements import ColumnElement


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


TField = TypeVar("TField", bound=Enum)


@dataclass(frozen=True, slots=True)
class SortParams(Generic[TField]):
    field: TField
    order: SortOrder = SortOrder.desc


def apply_sort(
    query: Select,
    *,
    sort: SortParams[TField],
    fields: dict[TField, ColumnElement],
) -> Select:
    column = fields.get(sort.field)
    if column is None:
        allowed = ", ".join(sorted(fields))
        raise ValueError(f"Unsupported sort field '{sort.field}'. Allowed: {allowed}.")
    order_by = column.asc() if sort.order == SortOrder.asc else column.desc()
    return query.order_by(order_by)
