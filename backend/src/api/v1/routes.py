"""API v1 routes."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo
from decimal import Decimal

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.models.entry import Entry
from src.models.enums import EntryStatus, TransactionDirection
from src.models.transaction import Transaction
from src.models.user import User
from src.auth.dependencies import get_current_user
from src.services import (
    EntryCreate,
    FilterClause,
    TransactionCreate,
    TransactionUpdate,
    create_entry,
    create_transactions,
    get_entry,
    get_transaction,
    list_transactions_paginated,
    soft_delete_transactions_for_entry,
    SortParams,
    touch_entry,
    update_entry_status,
    update_transaction,
)
from src.api.v1.auth import router as auth_router
from src.api.v1.examples import (
    CONFIRM_REQUEST_EXAMPLES,
    CONFIRM_RESPONSE_EXAMPLES,
    PARSE_REQUEST_EXAMPLES,
    PARSE_RESPONSE_EXAMPLES,
    SUMMARY_RESPONSE_EXAMPLES,
    TRANSACTION_UPDATE_REQUEST_EXAMPLES,
    TRANSACTION_UPDATE_RESPONSE_EXAMPLES,
    TRANSACTIONS_RESPONSE_EXAMPLES,
)
from src.parser.service import LLMParser, ParserError, get_parser
from src.api.v1.filters import get_transaction_filters
from src.api.v1.pagination import build_paginated_response, get_pagination
from src.api.v1.sorting import build_sort_dependency
from src.services.pagination import PaginationParams
from src.services.transaction_service import (
    TRANSACTION_DEFAULT_SORT,
    TRANSACTION_SORT_FIELDS,
    TransactionField,
)
from src.api.v1.schemas import (
    CategorySummary,
    ConfirmRequest,
    ConfirmResponse,
    ParsePreview,
    ParseRequest,
    ParseResponse,
    SummaryResponse,
    TransactionOut,
    TransactionUpdateRequest,
    TransactionsResponse,
    date_range,
    month_range,
)

router = APIRouter()
router.include_router(auth_router)

transaction_sort_dependency = build_sort_dependency(
    sort_enum=TransactionField,
    allowed_fields=sorted(
        TRANSACTION_SORT_FIELDS.keys(),
        key=lambda field: field.value,
    ),
    default_field=TRANSACTION_DEFAULT_SORT.field,
    default_order=TRANSACTION_DEFAULT_SORT.order,
)


@router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/parse",
    response_model=ParseResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {
            "content": {"application/json": {"examples": PARSE_RESPONSE_EXAMPLES}},
        }
    },
    tags=["parse"],
)
async def parse_text(
    payload: ParseRequest = Body(..., examples=PARSE_REQUEST_EXAMPLES),
    session: AsyncSession = Depends(get_session),
    parser: LLMParser = Depends(get_parser),
    current_user: User = Depends(get_current_user),
) -> ParseResponse:
    tzinfo = ZoneInfo("Asia/Kolkata")
    reference_datetime = payload.reference_datetime
    if reference_datetime is None:
        reference_datetime = datetime.now(tzinfo)
    elif reference_datetime.tzinfo is None:
        reference_datetime = reference_datetime.replace(tzinfo=tzinfo)
    try:
        result = await parser.parse(
            raw_text=payload.raw_text,
            reference_datetime=reference_datetime,
        )
    except ParserError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    preview = ParsePreview.model_validate(result.preview)
    preview_json = preview.model_dump(mode="json")
    needs_confirmation = bool(result.preview.get("needs_confirmation"))
    if not preview.transactions:
        needs_confirmation = True
    preview_json["needs_confirmation"] = needs_confirmation
    entry_status = EntryStatus.pending_confirmation if needs_confirmation else EntryStatus.confirmed
    entry = await create_entry(
        session,
        entry=EntryCreate(
            user_id=current_user.id,
            raw_text=payload.raw_text,
            status=entry_status,
            parser_output_json={
                "raw_output": result.raw_output,
                "post_processed": preview_json,
            },
            parser_version=result.parser_version,
        ),
    )
    if not needs_confirmation and preview.transactions:
        occurred_at = preview.occurred_time or reference_datetime
        transaction_inputs = [
            TransactionCreate(
                entry_id=entry.id,
                occurred_at=occurred_at,
                amount=item.amount,
                currency=item.currency,
                direction=item.direction,
                type=item.type,
                category=item.category,
                assumptions_json=item.assumptions,
            )
            for item in preview.transactions
        ]
        await create_transactions(session, items=transaction_inputs)
    return ParseResponse(
        entry_id=entry.id,
        status=entry.status,
        **preview.model_dump(mode="json"),
    )


@router.post(
    "/entries/confirm",
    response_model=ConfirmResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {
            "content": {"application/json": {"examples": CONFIRM_RESPONSE_EXAMPLES}},
        }
    },
    tags=["entries"],
)
async def confirm_entry(
    payload: ConfirmRequest = Body(..., examples=CONFIRM_REQUEST_EXAMPLES),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ConfirmResponse:
    entry = await get_entry(session, payload.entry_id)
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )

    transaction_inputs = [
        TransactionCreate(
            entry_id=entry.id,
            occurred_at=item.occurred_time,
            amount=item.amount,
            currency=item.currency,
            direction=item.direction,
            type=item.type,
            category=item.category,
            assumptions_json=item.assumptions,
        )
        for item in payload.transactions
    ]

    try:
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
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(entry)
    for transaction in transactions:
        await session.refresh(transaction)

    return ConfirmResponse(entry=entry, transactions=transactions)


@router.patch(
    "/transactions/{transaction_id}",
    response_model=TransactionOut,
    responses={
        200: {
            "content": {
                "application/json": {"examples": TRANSACTION_UPDATE_RESPONSE_EXAMPLES}
            },
        }
    },
    tags=["transactions"],
)
async def update_transaction_route(
    transaction_id: int,
    payload: TransactionUpdateRequest = Body(
        ..., examples=TRANSACTION_UPDATE_REQUEST_EXAMPLES
    ),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> TransactionOut:
    transaction = await get_transaction(session, transaction_id=transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    entry = await get_entry(session, transaction.entry_id)
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    if entry.status != EntryStatus.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transaction can only be edited after confirmation",
        )
    try:
        updated = await update_transaction(
            session,
            transaction=transaction,
            update=TransactionUpdate(
                amount=payload.amount,
                currency=payload.currency,
                direction=payload.direction,
                type=payload.type,
                category=payload.category,
            ),
            commit=False,
        )
        await touch_entry(session, entry=entry, commit=False)
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(updated)
    response = TransactionOut.model_validate(updated)

    return response


@router.get(
    "/transactions",
    response_model=TransactionsResponse,
    responses={
        200: {
            "content": {"application/json": {"examples": TRANSACTIONS_RESPONSE_EXAMPLES}},
        }
    },
    tags=["transactions"],
)
async def list_transactions(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    pagination: PaginationParams = Depends(get_pagination),
    sort: SortParams[TransactionField] = Depends(transaction_sort_dependency),
    filters: list[FilterClause[TransactionField]] = Depends(get_transaction_filters),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> TransactionsResponse:
    start, end = date_range(from_date, to_date)
    items, total_count = await list_transactions_paginated(
        session,
        from_date=start,
        to_date=end,
        user_id=current_user.id,
        pagination=pagination,
        sort=sort,
        filters=filters,
    )
    return TransactionsResponse(
        **build_paginated_response(
            items=items,
            total_count=total_count,
            pagination=pagination,
        )
    )


@router.get(
    "/summary",
    response_model=SummaryResponse,
    responses={
        200: {"content": {"application/json": {"examples": SUMMARY_RESPONSE_EXAMPLES}}},
    },
    tags=["summary"],
)
async def get_summary(
    month: str = Query(..., description="YYYY-MM"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
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
        Entry.user_id == current_user.id,
        Transaction.occurred_at >= start,
        Transaction.occurred_at < end,
    ]

    totals_query = (
        select(Transaction.direction, func.coalesce(func.sum(Transaction.amount), 0))
        .join(Entry)
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
        .join(Entry)
        .where(*base_filters)
        .group_by(Transaction.direction, Transaction.category)
        .order_by(Transaction.direction, Transaction.category)
    )
    category_result = await session.execute(category_query)
    by_category = [
        CategorySummary(direction=direction, category=category, total=total)
        for direction, category, total in category_result.all()
    ]

    count_query = select(func.count(Transaction.id)).join(Entry).where(*base_filters)
    count_result = await session.scalar(count_query)

    return SummaryResponse(
        month=month,
        total_inflow=total_inflow,
        total_outflow=total_outflow,
        net=total_inflow - total_outflow,
        by_category=by_category,
        transaction_count=int(count_result or 0),
    )
