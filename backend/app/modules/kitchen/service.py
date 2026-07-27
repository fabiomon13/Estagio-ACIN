# Business logic for the Kitchen module: building the ticket board
# (get_active_tickets) and moving an item through its states
# (update_item_status). Kept separate from router.py so it can be unit
# tested with a plain db_session, without going through HTTP/auth.

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.tag_item import TagItem
from app.modules.kitchen.schemas import KitchenOrderItemOut, KitchenTicketOut

# An item is "active" while it's in one of these statuses. Served/Cancelled/Returned are terminal: once
# every item on a ticket is terminal, the ticket drops off the board 
ACTIVE_STATUS_NAMES = ("Pending", "Preparing", "Ready")


def get_active_tickets(db: Session) -> list[KitchenTicketOut]:
    """Every ticket (= one Order) that has at least one active item, oldest
    first, each with ALL of its items (not just the active ones) so the
    card always shows the full round"""

    # Orders with at least one active item.
    active_order_ids = (
        select(OrderItem.order_id)
        .join(OrderItemStatus, OrderItem.status_id == OrderItemStatus.id)
        .where(OrderItemStatus.name.in_(ACTIVE_STATUS_NAMES))
        .distinct()
    )

   # Load all data needed by the ticket cards.
    orders = (
        db.execute(
            select(Order)
            .where(Order.id.in_(active_order_ids))
            .options(
                joinedload(Order.guest)
                .joinedload(Guest.dining_session)
                .joinedload(DiningSession.restaurant_table),
                selectinload(Order.items).joinedload(OrderItem.status),
                selectinload(Order.items)
                .joinedload(OrderItem.menu_item)
                .joinedload(MenuItem.station),
                selectinload(Order.items)
                .joinedload(OrderItem.menu_item)
                .selectinload(MenuItem.tag_links)
                .joinedload(TagItem.tag),
            )
            .order_by(Order.created_at.asc(), Order.id.asc())
        )
        .unique()
        .scalars()
        .all()
    )

    guest_numbers = _build_guest_number_lookup(db, orders)

    return [_build_ticket(order, guest_numbers) for order in orders]


def _build_guest_number_lookup(db: Session, orders: list[Order]) -> dict[int, int]:
    """guest_number isn't a stored column -- it's "which guest, in arrival
    order, within this table's dining session" (1st guest to join = 1, 2nd
    = 2, ...)"""

    session_ids = {order.guest.session_id for order in orders}
    if not session_ids:
        return {}

    guests = (
        db.execute(
            select(Guest)
            .where(Guest.session_id.in_(session_ids))
            .order_by(Guest.session_id.asc(), Guest.created_at.asc(), Guest.id.asc())
        )
        .scalars()
        .all()
    )

    guest_numbers: dict[int, int] = {}
    counters: dict[int, int] = {}
    for guest in guests:
        counters[guest.session_id] = counters.get(guest.session_id, 0) + 1
        guest_numbers[guest.id] = counters[guest.session_id]

    return guest_numbers


def _build_ticket(order: Order, guest_numbers: dict[int, int]) -> KitchenTicketOut:

    items = sorted(order.items, key=lambda item: (item.created_at, item.id))

    return KitchenTicketOut(
        order_id=order.id,
        table_number=order.guest.dining_session.restaurant_table.table_number,
        guest_number=guest_numbers[order.guest_id],
        round_number=order.round_number,
        created_at=order.created_at,
        items=[_build_item(item) for item in items],
    )


def _build_item(item: OrderItem) -> KitchenOrderItemOut:
    return KitchenOrderItemOut(
        order_item_id=item.id,
        menu_item_name=item.menu_item.name,
        quantity=item.quantity,
        notes=item.notes,
        tags=sorted(link.tag.name for link in item.menu_item.tag_links),
        station_id=item.menu_item.station_id,
        station=item.menu_item.station.name,
        status=item.status.name,
        created_at=item.created_at,
    )


# Kitchen-only status transitions.
VALID_TRANSITIONS = {
    "Pending": "Preparing",
    "Preparing": "Ready",
}


def update_item_status(db: Session, order_item_id: int, new_status: str) -> KitchenOrderItemOut:
    """Move an item to its next valid status."""

    item = db.get(
        OrderItem,
        order_item_id,
        options=[
            joinedload(OrderItem.status),
            joinedload(OrderItem.menu_item).joinedload(MenuItem.station),
            joinedload(OrderItem.menu_item)
            .selectinload(MenuItem.tag_links)
            .joinedload(TagItem.tag),
        ],
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item de pedido não encontrado",
        )

    current_status_name = item.status.name
    if VALID_TRANSITIONS.get(current_status_name) != new_status:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível mudar de '{current_status_name}' para '{new_status}'",
        )

    new_status_row = db.scalar(select(OrderItemStatus).where(OrderItemStatus.name == new_status))

    # Conditional UPDATE guards against a race between two chefs acting on
    # the same item at nearly the same time: only succeeds if the status is
    # still what we just read it as
    result = db.execute(
        update(OrderItem)
        .where(OrderItem.id == order_item_id, OrderItem.status_id == item.status_id)
        .values(status_id=new_status_row.id)
    )

    if result.rowcount == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O estado do item mudou entretanto, tenta novamente",
        )

    db.commit()
    db.refresh(item)

    return _build_item(item)
