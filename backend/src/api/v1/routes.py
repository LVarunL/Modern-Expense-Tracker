"""API v1 routes."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_session
from src.models.enums import EntryStatus, TransactionDirection
from src.models.transaction import Transaction
from src.services import (
    EntryCreate,
    TransactionCreate,
    create_entry,
    create_transactions,
    get_entry,
    list_transactions as list_transactions_service,
    soft_delete_transactions_for_entry,
    update_entry_status,
)
from src.api.v1.schemas import (
    CategorySummary,
    ConfirmRequest,
    ConfirmResponse,
    ParsePreview,
    ParseRequest,
    ParseResponse,
    SummaryResponse,
    TransactionsResponse,
    date_range,
    month_range,
)

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/parse",
    response_model=ParseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["parse"],
)
async def parse_text(
    payload: ParseRequest,
    session: AsyncSession = Depends(get_session),
) -> ParseResponse:
    settings = get_settings()
    preview = ParsePreview(
        occurred_at=payload.occurred_at_hint,
        needs_confirmation=True,
    )
    entry = await create_entry(
        session,
        entry=EntryCreate(
            user_id=settings.default_user_id,
            raw_text=payload.raw_text,
            occurred_at_hint=payload.occurred_at_hint,
            status=EntryStatus.pending_confirmation,
            parser_output_json=preview.model_dump(mode="json"),
            parser_version="mock-v0",
        ),
    )
    return ParseResponse(
        entry_id=entry.id,
        status=entry.status,
        **preview.model_dump(),
    )


@router.post(
    "/entries/confirm",
    response_model=ConfirmResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["entries"],
)
async def confirm_entry(
    payload: ConfirmRequest,
    session: AsyncSession = Depends(get_session),
) -> ConfirmResponse:
    settings = get_settings()
    entry = await get_entry(session, payload.entry_id)
    if not entry or entry.user_id != settings.default_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    transaction_inputs = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=item.occurred_at,
            amount=item.amount,
            currency=item.currency,
            direction=item.direction,
            type=item.type,
            category=item.category,
            subcategory=item.subcategory,
            merchant=item.merchant,
            confidence=item.confidence,
            needs_confirmation=item.needs_confirmation,
            assumptions_json=item.assumptions,
        )
        for item in payload.transactions
    ]

    async with session.begin():
        await soft_delete_transactions_for_entry(
            session,
            entry_id=entry.id,
            commit=False,
        )
        transactions = await create_transactions(
            session,
            items=transaction_inputs,
            commit=False,
        )
        await update_entry_status(
            session,
            entry=entry,
            status=EntryStatus.confirmed,
            commit=False,
        )

    return ConfirmResponse(entry=entry, transactions=transactions)


@router.get("/transactions", response_model=TransactionsResponse, tags=["transactions"])
async def list_transactions(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> TransactionsResponse:
    start, end = date_range(from_date, to_date)
    items = await list_transactions_service(
        session,
        from_date=start,
        to_date=end,
        limit=limit,
        offset=offset,
    )
    return TransactionsResponse(items=items, count=len(items))


@router.get("/summary", response_model=SummaryResponse, tags=["summary"])
async def get_summary(
    month: str = Query(..., description="YYYY-MM"),
    session: AsyncSession = Depends(get_session),
) -> SummaryResponse:
    try:
        start, end = month_range(month)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid month format. Use YYYY-MM.",
        ) from exc

    base_filters = [
        Transaction.is_deleted.is_(False),
        Transaction.occurred_at >= start,
        Transaction.occurred_at < end,
    ]

    totals_query = (
        select(Transaction.direction, func.coalesce(func.sum(Transaction.amount), 0))
        .where(*base_filters)
        .group_by(Transaction.direction)
    )
    totals_result = await session.execute(totals_query)
    totals = {direction: total for direction, total in totals_result.all()}
    total_inflow = totals.get(TransactionDirection.inflow, Decimal("0"))
    total_outflow = totals.get(TransactionDirection.outflow, Decimal("0"))

    category_query = (
        select(
            Transaction.direction,
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .where(*base_filters)
        .group_by(Transaction.direction, Transaction.category)
        .order_by(Transaction.direction, Transaction.category)
    )
    category_result = await session.execute(category_query)
    by_category = [
        CategorySummary(direction=direction, category=category, total=total)
        for direction, category, total in category_result.all()
    ]

    return SummaryResponse(
        month=month,
        total_inflow=total_inflow,
        total_outflow=total_outflow,
        net=total_inflow - total_outflow,
        by_category=by_category,
    )
