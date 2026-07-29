# backend/app/modules/client/routes/billing.py

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.guest import Guest
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.payment import Payment
from app.modules.client.dependencies import CurrentGuest
from app.modules.client.schemas import BillResponse


router = APIRouter(
    tags=["Client - Billing"],
)


@router.get(
    "/tables/{table_code}/bill",
    response_model=BillResponse,
)
def get_bill(
    table_code: str,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> BillResponse:
    session_guests = list(
        db.scalars(
            select(Guest)
            .options(
                selectinload(Guest.buffet),
            )
            .where(
                Guest.session_id == guest.session_id,
            )
        ).all()
    )

    buffet_total = sum(
        (
            Decimal(session_guest.buffet.price)
            for session_guest in session_guests
            if session_guest.buffet is not None
        ),
        start=Decimal("0.00"),
    )

    extras_value = db.scalar(
        select(
            func.coalesce(
                func.sum(
                    OrderItem.quantity
                    * OrderItem.unit_price_at_order
                ),
                0,
            )
        )
        .join(
            Order,
            Order.id == OrderItem.order_id,
        )
        .join(
            Guest,
            Guest.id == Order.guest_id,
        )
        .join(
            OrderItemStatus,
            OrderItemStatus.id == OrderItem.status_id,
        )
        .where(
            Guest.session_id == guest.session_id,
            Guest.buffet_id.is_(None),
            OrderItemStatus.alias.notin_(
                ("cancelled", "returned")
            ),
        )
    )

    extras_total = Decimal(extras_value or 0)

    payment = db.scalar(
        select(Payment).where(
            Payment.session_id == guest.session_id,
        )
    )

    waste_unit_charge = max(
        (
            Decimal(session_guest.buffet.waste_charge)
            for session_guest in session_guests
            if session_guest.buffet is not None
        ),
        default=Decimal("0.00"),
    )

    waste_count = (
        payment.waste_count
        if payment is not None
        else 0
    )

    waste_total = (
        Decimal(waste_count)
        * waste_unit_charge
    )

    tip_amount = (
        Decimal(payment.tip_amount)
        if payment is not None
        else Decimal("0.00")
    )

    total = (
        buffet_total
        + extras_total
        + waste_total
        + tip_amount
    )

    return BillResponse(
        session_id=guest.session_id,
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