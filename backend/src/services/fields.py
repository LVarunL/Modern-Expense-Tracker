"""Field metadata for sort/filter definitions."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Generic, TypeVar

from sqlalchemy.sql.elements import ColumnElement

TField = TypeVar("TField", bound=Enum)


@dataclass(frozen=True, slots=True)
class FieldSpec(Generic[TField]):
    id: TField
    column: ColumnElement
    sortable: bool = False
    filterable: bool = False
    label: str | None = None


def sortable_field_map(fields: list[FieldSpec[TField]]) -> dict[TField, ColumnElement]:
    return {field.id: field.column for field in fields if field.sortable}


def filterable_field_map(fields: list[FieldSpec[TField]]) -> dict[TField, ColumnElement]:
    return {field.id: field.column for field in fields if field.filterable}
