# backend/app/modules/client/services/billing.py

from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.guest import Guest
from app.models.buffet import Buffet
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


def calculate_buffet_total(
    db: Session,
    session_id: int,
) -> Decimal:
    buffet_value = db.scalar(
        select(func.coalesce(func.sum(Buffet.price), 0))
        .join(Guest, Guest.buffet_id == Buffet.id)
        .where(Guest.session_id == session_id)
    )

    return Decimal(buffet_value or 0)


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


WASTE_BOX_PRICE = Decimal("6.00")


def calculate_waste_total(
    session_guests: Sequence[Guest],
    payment: Payment | None,
) -> Decimal:
    if payment is None or payment.waste_count <= 0:
        return ZERO_MONEY

    return Decimal(payment.waste_count) * WASTE_BOX_PRICE


def calculate_guest_extras_total(
    db: Session,
    guest_id: int,
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
        .join(Order, Order.id == OrderItem.order_id)
        .join(OrderItemStatus, OrderItemStatus.id == OrderItem.status_id)
        .join(Guest, Guest.id == Order.guest_id)
        .outerjoin(
            BuffetItem,
            and_(
                BuffetItem.menu_item_id == OrderItem.item_id,
                BuffetItem.buffet_id == Guest.buffet_id,
            ),
        )
        .where(
            Order.guest_id == guest_id,
            OrderItemStatus.alias.notin_(EXCLUDED_ITEM_STATUSES),
            or_(
                Guest.buffet_id.is_(None),
                BuffetItem.menu_item_id.is_(None),
            ),
        )
    )

    return Decimal(extras_value or 0)
