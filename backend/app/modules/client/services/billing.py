# backend/app/modules/client/services/billing.py

from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.guest import Guest
from app.models.buffet_item import BuffetItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.payment import Payment


ZERO_MONEY = Decimal("0.00")

EXCLUDED_ITEM_STATUSES = (
    "cancelled",
    "returned",
)


def calculate_extras_total(
    db: Session,
    session_id: int,
) -> Decimal:
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
        .outerjoin(
            BuffetItem,
            and_(
                BuffetItem.menu_item_id == OrderItem.item_id,
                BuffetItem.buffet_id == Guest.buffet_id,
            ),
        )
        .where(
            Guest.session_id == session_id,
            OrderItemStatus.alias.notin_(
                EXCLUDED_ITEM_STATUSES
            ),
            or_(
                Guest.buffet_id.is_(None),
                BuffetItem.menu_item_id.is_(None),
            ),
        )
    )

    return Decimal(extras_value or 0)


def calculate_waste_total(
    session_guests: Sequence[Guest],
    payment: Payment | None,
) -> Decimal:
    if payment is None or payment.waste_count <= 0:
        return ZERO_MONEY

    # Payment only stores a session-wide waste count, without identifying
    # which guest or buffet produced each unit. Use the highest applicable
    # buffet charge so the rule remains deterministic for mixed sessions.
    waste_unit_charge = max(
        (
            Decimal(guest.buffet.waste_charge)
            for guest in session_guests
            if guest.buffet is not None
        ),
        default=ZERO_MONEY,
    )

    return (
        Decimal(payment.waste_count)
        * waste_unit_charge
    )
