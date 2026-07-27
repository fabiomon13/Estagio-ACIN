#backend/app/db/order_item_statuses.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.order_item_status import OrderItemStatus


DEFAULT_ORDER_ITEM_STATUSES = [
    ("Pending", "pending"),
    ("Preparing", "preparing"),
    ("Ready", "ready"),
    ("Cancelled", "cancelled"),
    ("Served", "served"),
    ("Returned", "returned"),
]


def seed_order_item_statuses() -> None:
    """Insere os estados de item de pedido predefinidos que ainda não existem."""
    status_names = [
        status_name
        for status_name, _status_alias in DEFAULT_ORDER_ITEM_STATUSES
    ]

    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(OrderItemStatus.name).where(
                    OrderItemStatus.name.in_(status_names)
                )
            ).all()
        )

        new_order_item_statuses = [
            OrderItemStatus(
                name=status_name,
                alias=status_alias,
            )
            for status_name, status_alias in DEFAULT_ORDER_ITEM_STATUSES
            if status_name not in existing_names
        ]

        session.add_all(new_order_item_statuses)
        session.commit()

        print(f"{len(new_order_item_statuses)} estados de item de pedido adicionados.")


if __name__ == "__main__":
    seed_order_item_statuses()
