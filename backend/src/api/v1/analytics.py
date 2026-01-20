"""Analytics endpoints."""

from __future__ import annotations

from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.queries import (
    fetch_category_totals,
    fetch_series,
    fetch_summary,
    fetch_type_totals,
)
from src.analytics.range import normalize_epoch_range
from src.analytics.types import AnalyticsBucket
from src.api.v1.filters import get_transaction_filters
from src.api.v1.schemas import (
    AnalyticsCategoryResponse,
    AnalyticsSeriesResponse,
    AnalyticsSummaryResponse,
    AnalyticsTypeResponse,
)
from src.api.v1.examples import (
    ANALYTICS_CATEGORY_EXAMPLES,
    ANALYTICS_SERIES_EXAMPLES,
    ANALYTICS_SUMMARY_EXAMPLES,
    ANALYTICS_TYPE_EXAMPLES,
)
from src.auth.dependencies import get_current_user
from src.database import get_session
from src.models.user import User
from src.services.filtering import FilterClause
from src.services.transaction_service import TransactionField

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _ensure_timezone(tz: str) -> None:
    try:
        ZoneInfo(tz)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid timezone. Use an IANA name like 'Asia/Kolkata'.",
        ) from exc


@router.get(
    "/series",
    response_model=AnalyticsSeriesResponse,
    responses={
        200: {"content": {"application/json": {"examples": ANALYTICS_SERIES_EXAMPLES}}},
    },
)
async def analytics_series(
    from_ms: int = Query(..., description="Epoch milliseconds start time (inclusive)."),
    to_ms: int = Query(..., description="Epoch milliseconds end time (exclusive)."),
    bucket: AnalyticsBucket = Query(default=AnalyticsBucket.day),
    tz: str | None = Query(default=None),
    filters: list[FilterClause[TransactionField]] = Depends(get_transaction_filters),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSeriesResponse:
    resolved_tz = tz or current_user.timezone or "UTC"
    _ensure_timezone(resolved_tz)
    try:
        date_range = normalize_epoch_range(from_ms, to_ms)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    items = await fetch_series(
        session,
        user_id=current_user.id,
        date_range=date_range,
        bucket=bucket,
        tz=resolved_tz,
        filters=filters,
    )
    return AnalyticsSeriesResponse(bucket=bucket, items=items)


@router.get(
    "/categories",
    response_model=AnalyticsCategoryResponse,
    responses={
        200: {"content": {"application/json": {"examples": ANALYTICS_CATEGORY_EXAMPLES}}},
    },
)
async def analytics_categories(
    from_ms: int = Query(..., description="Epoch milliseconds start time (inclusive)."),
    to_ms: int = Query(..., description="Epoch milliseconds end time (exclusive)."),
    filters: list[FilterClause[TransactionField]] = Depends(get_transaction_filters),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AnalyticsCategoryResponse:
    try:
        date_range = normalize_epoch_range(from_ms, to_ms)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    items = await fetch_category_totals(
        session,
        user_id=current_user.id,
        date_range=date_range,
        filters=filters,
    )
    return AnalyticsCategoryResponse(items=items)


@router.get(
    "/types",
    response_model=AnalyticsTypeResponse,
    responses={
        200: {"content": {"application/json": {"examples": ANALYTICS_TYPE_EXAMPLES}}},
    },
)
async def analytics_types(
    from_ms: int = Query(..., description="Epoch milliseconds start time (inclusive)."),
    to_ms: int = Query(..., description="Epoch milliseconds end time (exclusive)."),
    filters: list[FilterClause[TransactionField]] = Depends(get_transaction_filters),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AnalyticsTypeResponse:
    try:
        date_range = normalize_epoch_range(from_ms, to_ms)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    items = await fetch_type_totals(
        session,
        user_id=current_user.id,
        date_range=date_range,
        filters=filters,
    )
    return AnalyticsTypeResponse(items=items)


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    responses={
        200: {"content": {"application/json": {"examples": ANALYTICS_SUMMARY_EXAMPLES}}},
    },
)
async def analytics_summary(
    from_ms: int = Query(..., description="Epoch milliseconds start time (inclusive)."),
    to_ms: int = Query(..., description="Epoch milliseconds end time (exclusive)."),
    filters: list[FilterClause[TransactionField]] = Depends(get_transaction_filters),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    try:
        date_range = normalize_epoch_range(from_ms, to_ms)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    summary = await fetch_summary(
        session,
        user_id=current_user.id,
        date_range=date_range,
        filters=filters,
    )
    return AnalyticsSummaryResponse(**summary)
