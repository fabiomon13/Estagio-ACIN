# Business logic for the Kitchen module: building the ticket board
# (get_active_tickets) and moving an item through its states
# (update_item_status). Kept separate from router.py so it can be unit
# tested with a plain db_session, without going through HTTP/auth.

import logging
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session, aliased, joinedload, selectinload

from app.modules.staff.websockets.staff_realtime import broadcast_staff_dashboard

from app.models.category import Category
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.restaurant_table import RestaurantTable
from app.models.station import Station
from app.models.tag_item import TagItem
from app.modules.kitchen.schemas import (
    KitchenHistoryBaseFilters,
    KitchenHistoryFilterOptionOut,
    KitchenHistoryFilterOptionsOut,
    KitchenHistoryFilters,
    KitchenHistoryItemOut,
    KitchenHistoryListOut,
    KitchenHistorySummaryOut,
    KitchenOrderItemOut,
    KitchenTicketOut,
)
from app.modules.kitchen.websocket import KITCHEN_TOPIC, connection_manager
from app.modules.client.realtime import publish_guest_event

logger = logging.getLogger(__name__)

# An item is "active" while it's in one of these statuses. Served/Cancelled/Returned are terminal: once
# every item on a ticket is terminal, the ticket drops off the board
ACTIVE_STATUS_NAMES = ("Pending", "Preparing", "Ready")

# Every status a history item can be in -- used so /history/summary always
# reports every status, including ones with zero matches this range.
ALL_ORDER_ITEM_STATUS_NAMES = ("Pending", "Preparing", "Ready", "Served", "Cancelled", "Returned")


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
                joinedload(Order.guest).joinedload(Guest.allergy_tags),
                selectinload(Order.items).joinedload(OrderItem.status),
                selectinload(Order.items)
                .joinedload(OrderItem.menu_item)
                .joinedload(MenuItem.station),
                selectinload(Order.items)
                .joinedload(OrderItem.menu_item)
                .joinedload(MenuItem.category)
                .joinedload(Category.default_station),
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
    station = item.menu_item.effective_station
    dish_tag_names = sorted(link.tag.name for link in item.menu_item.tag_links)
    guest_allergy_names = {tag.name for tag in item.order.guest.allergy_tags}
    return KitchenOrderItemOut(
        order_item_id=item.id,
        menu_item_name=item.menu_item.name,
        quantity=item.quantity,
        notes=item.notes,
        tags=dish_tag_names,
        matched_allergens=[name for name in dish_tag_names if name in guest_allergy_names],
        station_id=station.id,
        station=station.name,
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
            joinedload(OrderItem.order),
            joinedload(OrderItem.menu_item).joinedload(MenuItem.station),
            joinedload(OrderItem.menu_item)
            .joinedload(MenuItem.category)
            .joinedload(Category.default_station),
            joinedload(OrderItem.menu_item)
            .selectinload(MenuItem.tag_links)
            .joinedload(TagItem.tag),
            joinedload(OrderItem.order).joinedload(Order.guest).joinedload(Guest.allergy_tags),
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

    broadcast_active_tickets(db)
    broadcast_staff_dashboard(db)
    publish_guest_event(item.order.guest_id, "orders.changed")

    return _build_item(item)


def broadcast_active_tickets(db: Session) -> None:
    """Pushes a fresh board snapshot to every connected kitchen client. Called
    after any commit that can change what the board shows -- an item's status
    changing, or a new order arriving from the client module.

    Failures are logged and swallowed, not raised: the triggering write already
    committed, so a broken broadcast shouldn't 500 an otherwise-successful request.
    """
    try:
        tickets = get_active_tickets(db)
        connection_manager.broadcast(
            KITCHEN_TOPIC,
            {"tickets": [ticket.model_dump(mode="json") for ticket in tickets]},  # full snapshot, not a diff
        )
    except Exception:
        logger.exception("broadcast_active_tickets failed after a successful commit")


def _date_range_bounds(date_from: date, date_to: date | None) -> tuple[datetime, datetime]:
    """Half-open [start, end) range covering every moment of every day from
    date_from through date_to (inclusive), avoiding time.max microsecond edge cases.

    Built as Europe/Lisbon-aware datetimes, not naive ones: the DB session runs
    in UTC, so a naive bound here would be read as UTC midnight instead of
    Lisbon midnight, shifting the day's boundary by the UTC offset.
    """
    end_date = date_to or date_from
    range_start = datetime.combine(date_from, time.min, tzinfo=ZoneInfo("Europe/Lisbon"))
    range_end = datetime.combine(
        end_date + timedelta(days=1), time.min, tzinfo=ZoneInfo("Europe/Lisbon")
    )
    return range_start, range_end


def _build_history_query(filters: KitchenHistoryBaseFilters):
    """The joins + WHERE clauses shared by /history and /history/summary.
    No .options()/.order_by()/.limit() here -- callers add what they need."""
    range_start, range_end = _date_range_bounds(filters.date_from, filters.date_to)

    query = (
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Guest, Order.guest_id == Guest.id)
        .join(DiningSession, Guest.session_id == DiningSession.id)
        .join(RestaurantTable, DiningSession.table_id == RestaurantTable.id)
        .join(MenuItem, OrderItem.item_id == MenuItem.id)
        .join(Category, MenuItem.category_id == Category.id)
        .join(OrderItemStatus, OrderItem.status_id == OrderItemStatus.id)
        .where(OrderItem.updated_at >= range_start, OrderItem.updated_at < range_end)
    )

    if filters.table_number is not None:
        query = query.where(RestaurantTable.table_number == filters.table_number)
    if filters.item_id is not None:
        query = query.where(MenuItem.id == filters.item_id)
    if filters.station_id is not None:
        # Mirrors MenuItem.effective_station: a dish with no station of its
        # own falls back to its category's default_station.
        query = query.where(
            or_(
                MenuItem.station_id == filters.station_id,
                and_(
                    MenuItem.station_id.is_(None),
                    Category.default_station_id == filters.station_id,
                ),
            )
        )

    return query


def get_history_items(db: Session, filters: KitchenHistoryFilters) -> KitchenHistoryListOut:
    query = _build_history_query(filters)

    if filters.status is not None:
        query = query.where(OrderItemStatus.name == filters.status)

    total_count = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    items = (
        db.execute(
            query.options(
                joinedload(OrderItem.status),
                joinedload(OrderItem.menu_item).joinedload(MenuItem.station),
                joinedload(OrderItem.menu_item)
                .joinedload(MenuItem.category)
                .joinedload(Category.default_station),
                joinedload(OrderItem.order)
                .joinedload(Order.guest)
                .joinedload(Guest.dining_session)
                .joinedload(DiningSession.restaurant_table),
            )
            .order_by(OrderItem.updated_at.desc(), OrderItem.id.desc())
            .limit(filters.limit)
            .offset(filters.offset)
        )
        .unique()
        .scalars()
        .all()
    )

    return KitchenHistoryListOut(
        items=[_build_history_item(item) for item in items],
        total_count=total_count,
    )


def _build_history_item(item: OrderItem) -> KitchenHistoryItemOut:
    station = item.menu_item.effective_station
    table = item.order.guest.dining_session.restaurant_table
    return KitchenHistoryItemOut(
        order_item_id=item.id,
        menu_item_name=item.menu_item.name,
        table_number=table.table_number,
        round_number=item.order.round_number,
        quantity=item.quantity,
        station_id=station.id,
        station=station.name,
        status=item.status.name,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def get_history_summary(db: Session, filters: KitchenHistoryBaseFilters) -> KitchenHistorySummaryOut:
    query = (
        _build_history_query(filters)
        .with_only_columns(OrderItemStatus.name, func.count(OrderItem.id))
        .group_by(OrderItemStatus.name)
    )

    counts = {name: 0 for name in ALL_ORDER_ITEM_STATUS_NAMES}
    for name, count in db.execute(query).all():
        counts[name] = count

    return KitchenHistorySummaryOut(
        counts=counts,
        busiest_station=_get_busiest_station(db, filters),
        peak_hour=_get_peak_hour(db, filters),
    )


def _get_busiest_station(db: Session, filters: KitchenHistoryBaseFilters) -> str | None:
    """The station name with the most items -- same effective_station fallback
    (own station, else the dish's category default) as everywhere else, done
    here via two aliased joins + COALESCE since we need the *name*, not just
    an id to filter by."""
    menu_item_station = aliased(Station)
    category_default_station = aliased(Station)
    effective_station_name = func.coalesce(menu_item_station.name, category_default_station.name)

    query = (
        _build_history_query(filters)
        .join(menu_item_station, MenuItem.station_id == menu_item_station.id, isouter=True)
        .join(
            category_default_station,
            Category.default_station_id == category_default_station.id,
            isouter=True,
        )
        .with_only_columns(effective_station_name)
        .group_by(effective_station_name)
        .order_by(func.count(OrderItem.id).desc())
        .limit(1)
    )
    return db.scalar(query)


def _get_peak_hour(db: Session, filters: KitchenHistoryBaseFilters) -> int | None:
    """The hour (0-23, Lisbon local time, by updated_at) with the most items.

    The DB session runs in UTC, so updated_at is converted to Europe/Lisbon
    before extracting the hour -- otherwise the result is off by the UTC
    offset (0h or 1h depending on DST). Ties (equally busy hours) are broken
    by preferring the more recent hour, since ORDER BY count alone leaves
    ties in an arbitrary, unstable order.
    """
    local_updated_at = func.timezone("Europe/Lisbon", OrderItem.updated_at)
    hour_expr = func.extract("hour", local_updated_at)

    query = (
        _build_history_query(filters)
        .with_only_columns(hour_expr)
        .group_by(hour_expr)
        .order_by(func.count(OrderItem.id).desc(), hour_expr.desc())
        .limit(1)
    )
    result = db.scalar(query)
    return int(result) if result is not None else None


def get_history_filter_options(db: Session) -> KitchenHistoryFilterOptionsOut:
    menu_items = db.execute(select(MenuItem.id, MenuItem.name).order_by(MenuItem.name)).all()
    stations = db.execute(select(Station.id, Station.name).order_by(Station.name)).all()

    return KitchenHistoryFilterOptionsOut(
        items=[KitchenHistoryFilterOptionOut(id=row.id, name=row.name) for row in menu_items],
        stations=[KitchenHistoryFilterOptionOut(id=row.id, name=row.name) for row in stations],
    )
