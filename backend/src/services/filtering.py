"""Service-layer filtering helpers."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Generic, TypeVar

from sqlalchemy import Select
from sqlalchemy.sql.elements import ColumnElement

TField = TypeVar("TField", bound=Enum)


class FilterOperator(str, Enum):
    eq = "eq"
    in_ = "in"
    gte = "gte"
    lte = "lte"


@dataclass(frozen=True, slots=True)
class FilterClause(Generic[TField]):
    field: TField
    operator: FilterOperator
    value: Any


def apply_filters(
    query: Select,
    *,
    filters: list[FilterClause[TField]],
    fields: dict[TField, ColumnElement],
) -> Select:
    for clause in filters:
        column = fields.get(clause.field)
        if column is None:
            allowed = ", ".join(sorted(field.value for field in fields))
            raise ValueError(
                f"Unsupported filter field '{clause.field.value}'. Allowed: {allowed}."
            )
        if clause.operator == FilterOperator.eq:
            if clause.value is None:
                continue
            query = query.where(column == clause.value)
        elif clause.operator == FilterOperator.in_:
            if not clause.value:
                continue
            query = query.where(column.in_(clause.value))
        elif clause.operator == FilterOperator.gte:
            if clause.value is None:
                continue
            query = query.where(column >= clause.value)
        elif clause.operator == FilterOperator.lte:
            if clause.value is None:
                continue
            query = query.where(column <= clause.value)
        else:
            raise ValueError(f"Unsupported filter operator '{clause.operator.value}'.")
    return query
