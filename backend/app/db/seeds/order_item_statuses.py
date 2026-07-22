#backend/app/db/order_item_statuses.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.order_item_status import OrderItemStatus


DEFAULT_ORDER_ITEM_STATUSES = [
    "Pending",
    "Preparing",
    "Ready",
    "Cancelled",
    "Served",
    "Returned"
]


def seed_order_item_statuses() -> None:
    """Insere os estados de item de pedido predefinidos que ainda não existem."""
    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(OrderItemStatus.name).where(OrderItemStatus.name.in_(DEFAULT_ORDER_ITEM_STATUSES))
            ).all()
        )

        new_order_item_statuses = [
            OrderItemStatus(name=status_name)
            for status_name in DEFAULT_ORDER_ITEM_STATUSES
            if status_name not in existing_names
        ]

        session.add_all(new_order_item_statuses)
        session.commit()

        print(f"{len(new_order_item_statuses)} estados de item de pedido adicionados.")

if __name__ == "__main__":
    seed_order_item_statuses()