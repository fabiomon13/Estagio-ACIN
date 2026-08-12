"""Backfills a Payment for each closed round from order_history.py, so the
admin Payment History page (GET /staff/payments) has real data to show
during a presentation. Every payment attaches to an already-inactive
session, so this is safe to run on a presentation database.

Must run after seed_order_history() -- it looks up sessions by the same
deterministic device-token hash that seeder used, rather than recreating
any session/guest/order data itself.
"""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.seeds.order_history import HISTORY_ROUNDS
from app.db.session import SessionLocal
from app.models.guest import Guest
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.payment import Payment
from app.modules.client.security import hash_device_token
from app.modules.client.services.billing import WASTE_BOX_PRICE

# Rotates through a few methods/tips/waste-boxes so the Payment History page
# shows realistic variety instead of every row looking identical.
METHOD_CYCLE = ["cash", "cash", "card", "cash", "mb_way"]
TIP_CYCLE = [Decimal("0.00"), Decimal("0.00"), Decimal("2.00"), Decimal("0.00"), Decimal("5.00")]
WASTE_CYCLE = [0, 0, 0, 1, 0]


def seed_payments() -> None:
    with SessionLocal() as db_session:
        created = 0

        for round_index, _ in enumerate(HISTORY_ROUNDS):
            token_hash = hash_device_token(f"history-seed-round-{round_index}")
            guest = db_session.scalar(select(Guest).where(Guest.device_token_hash == token_hash))
            if guest is None:
                continue  # order_history hasn't been seeded (yet) -- nothing to attach a payment to

            existing = db_session.scalar(
                select(Payment).where(Payment.session_id == guest.session_id)
            )
            if existing is not None:
                continue

            order = db_session.scalar(select(Order).where(Order.guest_id == guest.id))
            if order is None:
                continue

            served_items = db_session.scalars(
                select(OrderItem)
                .join(OrderItemStatus, OrderItem.status_id == OrderItemStatus.id)
                .where(OrderItem.order_id == order.id, OrderItemStatus.alias == "served")
            ).all()

            subtotal = sum(
                (Decimal(item.unit_price_at_order) * item.quantity for item in served_items),
                Decimal("0.00"),
            )
            if subtotal <= 0:
                continue  # every item in this round was cancelled/returned -- nothing was actually paid

            method = METHOD_CYCLE[round_index % len(METHOD_CYCLE)]
            tip = TIP_CYCLE[round_index % len(TIP_CYCLE)]
            waste_count = WASTE_CYCLE[round_index % len(WASTE_CYCLE)]
            waste_total = Decimal(waste_count) * WASTE_BOX_PRICE

            db_session.add(
                Payment(
                    session_id=guest.session_id,
                    amount_paid=subtotal + tip + waste_total,
                    tip_amount=tip,
                    method=method,
                    waste_count=waste_count,
                    paid_at=order.created_at + timedelta(minutes=40),
                )
            )
            created += 1

        db_session.commit()
        print(f"{created} pagamentos de histórico adicionados.")


if __name__ == "__main__":
    seed_payments()
