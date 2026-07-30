#backend/app/db/seeds/orders.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus


DEFAULT_MENU_ITEM_ALIAS = "chicken-ramen"
DEFAULT_STATUS_ALIAS = "ready"
DEFAULT_ROUND_NUMBER = 1
DEFAULT_CLIENT_REQUEST_ID = "00000000-0000-4000-8000-000000000001"


def seed_orders() -> None:
    """Cria um pedido de exemplo com um item no estado Ready."""
    with SessionLocal() as session:
        guest = session.scalar(
            select(Guest).order_by(Guest.id).limit(1)
        )
        if guest is None:
            raise RuntimeError(
                "Nenhum convidado encontrado. Corre o seeder guests primeiro."
            )

        menu_item = session.scalar(
            select(MenuItem).where(
                MenuItem.alias == DEFAULT_MENU_ITEM_ALIAS
            )
        )
        if menu_item is None:
            raise RuntimeError(
                f"Item '{DEFAULT_MENU_ITEM_ALIAS}' não encontrado. "
                "Corre o seeder menu_items primeiro."
            )

        ready_status = session.scalar(
            select(OrderItemStatus).where(
                OrderItemStatus.alias == DEFAULT_STATUS_ALIAS
            )
        )
        if ready_status is None:
            raise RuntimeError(
                f"Estado '{DEFAULT_STATUS_ALIAS}' não encontrado. "
                "Corre o seeder order_item_statuses primeiro."
            )

        order = session.scalar(
            select(Order)
            .where(
                Order.guest_id == guest.id,
                Order.round_number == DEFAULT_ROUND_NUMBER,
            )
            .order_by(Order.id)
            .limit(1)
        )

        if order is None:
            order = Order(
                guest_id=guest.id,
                round_number=DEFAULT_ROUND_NUMBER,
                client_request_id=DEFAULT_CLIENT_REQUEST_ID,
            )
            session.add(order)
            session.flush()

        existing_order_item = session.scalar(
            select(OrderItem).where(
                OrderItem.order_id == order.id,
                OrderItem.item_id == menu_item.id,
            )
        )

        if existing_order_item is not None:
            print("O pedido de exemplo já existe.")
            return

        session.add(
            OrderItem(
                order_id=order.id,
                item_id=menu_item.id,
                status_id=ready_status.id,
                quantity=1,
                unit_price=menu_item.base_price,
                unit_price_at_order=menu_item.base_price,
            )
        )
        session.commit()

        print("Pedido de exemplo criado com um Chicken Ramen no estado Ready.")


if __name__ == "__main__":
    seed_orders()
