from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.guest import Guest
from app.models.payment import Payment
from app.modules.client.dependencies import (
    CurrentGuest,
    DbSession,
)
from app.modules.client.schemas import BillResponse
from app.modules.client.services.billing import (
    ZERO_MONEY,
    calculate_extras_total,
    calculate_waste_total,
)


router = APIRouter(
    tags=["Client - Billing"],
)


@router.get(
    "/tables/{table_code}/bill",
    response_model=BillResponse,
)
def get_bill(
    guest: CurrentGuest,
    db: DbSession,
) -> BillResponse:
    session_id = guest.session_id

    session_guests = list(
        db.scalars(
            select(Guest)
            .options(selectinload(Guest.buffet))
            .where(Guest.session_id == session_id)
        ).all()
    )

    buffet_total = sum(
        (
            Decimal(session_guest.buffet.price)
            for session_guest in session_guests
            if session_guest.buffet is not None
        ),
        ZERO_MONEY,
    )

    extras_total = calculate_extras_total(
        db=db,
        session_id=session_id,
    )

    payment = db.scalar(
        select(Payment).where(
            Payment.session_id == session_id,
        )
    )

    waste_total = calculate_waste_total(
        session_guests=session_guests,
        payment=payment,
    )

    tip_amount = (
        Decimal(payment.tip_amount)
        if payment is not None
        else ZERO_MONEY
    )

    total = (
        buffet_total
        + extras_total
        + waste_total
        + tip_amount
    )

    return BillResponse(
        session_id=session_id,
        buffet_total=buffet_total,
        extras_total=extras_total,
        waste_total=waste_total,
        tip_amount=tip_amount,
        total=total,
        is_paid=payment is not None,
        paid_at=(
            payment.paid_at
            if payment is not None
            else None
        ),
    )