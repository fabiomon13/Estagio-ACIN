import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.restaurant_table import RestaurantTable
from app.modules.client.security import hash_device_token


# Must already exist -- owned by guests.py, not created here.
EXISTING_GUEST_TOKENS = {
    "guest-with-buffet-device-token-001",
    "guest-without-buffet-device-token-002",
}

# Guests this seeder creates itself, on other tables, so the board isn't all "T1".
EXTRA_GUESTS = [
    # (device_token, table_number)
    ("kitchen-test-guest-table-3", 3),
    ("kitchen-test-guest-table-5", 5),
]

# Covers: same-status items grouping into one fragment, an allergen-free
# fragment (still-water/coca-cola are the only items with no allergen tag),
# and Served/Cancelled items (one allergen-free) to exercise the vanish behavior.
DEFAULT_ORDER_ITEMS = [
    # (guest_device_token, round_number, menu_item_alias, status_alias, notes)
    ("guest-with-buffet-device-token-001", 1, "shrimp-tempura", "pending", None),
    (
        "guest-with-buffet-device-token-001",
        1,
        "salmon-sashimi",
        "pending",
        "Sem wasabi, por favor",
    ),
    (
        "guest-with-buffet-device-token-001",
        1,
        "miso-ramen",
        "preparing",
        "Sem cebolinho, por favor",
    ),
    ("guest-with-buffet-device-token-001", 1, "salmon-nigiri", "ready", None),
    ("guest-with-buffet-device-token-001", 1, "still-water", "ready", None),
    ("guest-with-buffet-device-token-001", 2, "house-red-wine", "pending", None),
    ("guest-with-buffet-device-token-001", 2, "tuna-sashimi", "preparing", None),
    ("guest-without-buffet-device-token-002", 1, "coca-cola", "pending", None),
    (
        "guest-without-buffet-device-token-002",
        1,
        "still-water",
        "pending",
        "Bem gelada, por favor",
    ),
    ("guest-without-buffet-device-token-002", 1, "vegetable-tempura", "preparing", None),
    ("guest-without-buffet-device-token-002", 1, "tuna-nigiri", "served", None),
    ("guest-without-buffet-device-token-002", 1, "beer", "cancelled", None),
    ("guest-without-buffet-device-token-002", 2, "chocolate-mousse", "ready", None),
    (
        "guest-without-buffet-device-token-002",
        2,
        "cheesecake",
        "ready",
        "Aniversário — por favor com vela",
    ),
    ("guest-without-buffet-device-token-002", 2, "coca-cola", "served", None),
    ("kitchen-test-guest-table-3", 1, "salmon-nigiri", "pending", None),
    ("kitchen-test-guest-table-3", 1, "tuna-sashimi", "preparing", None),
    ("kitchen-test-guest-table-5", 1, "beer", "ready", None),
    (
        "kitchen-test-guest-table-5",
        1,
        "chocolate-mousse",
        "pending",
        "É alérgico a noz-moscada",
    ),
]


def _get_or_create_dining_session(session: Session, table_number: int) -> DiningSession:
    restaurant_table = session.scalar(
        select(RestaurantTable).where(RestaurantTable.table_number == table_number)
    )
    if restaurant_table is None:
        raise RuntimeError(
            f"Mesa {table_number} não encontrada. Corre o seeder restaurant_tables primeiro."
        )

    dining_session = session.scalar(
        select(DiningSession).where(
            DiningSession.table_id == restaurant_table.id,
            DiningSession.is_active.is_(True),
        )
    )
    if dining_session is not None:
        return dining_session

    dining_session = DiningSession(
        table_id=restaurant_table.id,
        num_clients=1,
        is_active=True,
        is_approved=False,
    )
    session.add(dining_session)
    session.flush()
    return dining_session


def _get_or_create_extra_guest(session: Session, device_token: str, table_number: int) -> Guest:
    dining_session = _get_or_create_dining_session(session, table_number)
    token_hash = hash_device_token(device_token)

    guest = session.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        )
    )
    if guest is not None:
        return guest

    guest = Guest(session_id=dining_session.id, buffet_id=None, device_token_hash=token_hash)
    session.add(guest)
    session.flush()
    return guest


def _get_or_create_order(session: Session, guest: Guest, round_number: int) -> Order:
    order = session.scalar(
        select(Order).where(
            Order.guest_id == guest.id,
            Order.round_number == round_number,
        )
    )
    if order is not None:
        return order

    order = Order(
        guest_id=guest.id,
        round_number=round_number,
        client_request_id=str(uuid.uuid4()),
    )
    session.add(order)
    session.flush()
    return order


def _resolve_guests(session: Session) -> dict[str, Guest]:
    token_hashes = {token: hash_device_token(token) for token in EXISTING_GUEST_TOKENS}
    existing = session.scalars(
        select(Guest).where(Guest.device_token_hash.in_(token_hashes.values()))
    ).all()
    guests_by_hash = {guest.device_token_hash: guest for guest in existing}

    missing_guests = {
        token for token, token_hash in token_hashes.items() if token_hash not in guests_by_hash
    }
    if missing_guests:
        raise RuntimeError(
            f"Convidados não encontrados: {', '.join(sorted(missing_guests))}. "
            "Corre o seeder guests primeiro."
        )

    guests_by_token = {token: guests_by_hash[token_hashes[token]] for token in EXISTING_GUEST_TOKENS}

    for device_token, table_number in EXTRA_GUESTS:
        guests_by_token[device_token] = _get_or_create_extra_guest(
            session, device_token, table_number
        )

    return guests_by_token


def seed_order_items() -> None:
    """Cria vários order items em estados variados, para testar o tablero da cozinha."""
    menu_item_aliases = {item[2] for item in DEFAULT_ORDER_ITEMS}
    status_aliases = {item[3] for item in DEFAULT_ORDER_ITEMS}

    with SessionLocal() as session:
        guests_by_token = _resolve_guests(session)

        menu_items = session.scalars(
            select(MenuItem).where(MenuItem.alias.in_(menu_item_aliases))
        ).all()
        items_by_alias = {item.alias: item for item in menu_items}

        missing_items = menu_item_aliases - items_by_alias.keys()
        if missing_items:
            raise RuntimeError(
                f"Itens não encontrados: {', '.join(sorted(missing_items))}. "
                "Corre o seeder menu_items primeiro."
            )

        statuses = session.scalars(
            select(OrderItemStatus).where(OrderItemStatus.alias.in_(status_aliases))
        ).all()
        statuses_by_alias = {status.alias: status for status in statuses}

        missing_statuses = status_aliases - statuses_by_alias.keys()
        if missing_statuses:
            raise RuntimeError(
                f"Estados não encontrados: {', '.join(sorted(missing_statuses))}. "
                "Corre o seeder order_item_statuses primeiro."
            )

        created_items = 0

        for guest_token, round_number, item_alias, status_alias, notes in DEFAULT_ORDER_ITEMS:
            guest = guests_by_token[guest_token]
            menu_item = items_by_alias[item_alias]
            status = statuses_by_alias[status_alias]

            order = _get_or_create_order(session, guest, round_number)

            existing_order_item = session.scalar(
                select(OrderItem).where(
                    OrderItem.order_id == order.id,
                    OrderItem.item_id == menu_item.id,
                )
            )
            if existing_order_item is not None:
                continue

            session.add(
                OrderItem(
                    order_id=order.id,
                    item_id=menu_item.id,
                    status_id=status.id,
                    quantity=1,
                    notes=notes,
                    unit_price=menu_item.base_price,
                    unit_price_at_order=menu_item.base_price,
                )
            )
            created_items += 1

        session.commit()

        print(f"{created_items} order items adicionados.")


def reset_order_items() -> None:
    """Remove exatamente o que este seeder criou: os order items, as orders
    que ficarem vazias, e os guests/sessions extra (mesas 3 e 5)."""
    all_tokens = EXISTING_GUEST_TOKENS | {token for token, _table in EXTRA_GUESTS}
    menu_item_aliases = {item[2] for item in DEFAULT_ORDER_ITEMS}

    with SessionLocal() as session:
        token_hashes = {hash_device_token(token) for token in all_tokens}
        guests = session.scalars(
            select(Guest).where(Guest.device_token_hash.in_(token_hashes))
        ).all()
        guest_ids = {guest.id for guest in guests}

        item_ids = set(
            session.scalars(
                select(MenuItem.id).where(MenuItem.alias.in_(menu_item_aliases))
            ).all()
        )

        order_ids = set(
            session.scalars(select(Order.id).where(Order.guest_id.in_(guest_ids))).all()
        )

        order_items = session.scalars(
            select(OrderItem).where(
                OrderItem.order_id.in_(order_ids),
                OrderItem.item_id.in_(item_ids),
            )
        ).all()

        deleted_items_count = len(order_items)
        for order_item in order_items:
            session.delete(order_item)
        session.flush()

        # Only delete orders left empty by the items above -- never one with unrelated items.
        remaining_order_ids = set(
            session.scalars(
                select(OrderItem.order_id).where(OrderItem.order_id.in_(order_ids)).distinct()
            ).all()
        )
        empty_order_ids = order_ids - remaining_order_ids

        deleted_orders_count = len(empty_order_ids)
        for order in session.scalars(select(Order).where(Order.id.in_(empty_order_ids))).all():
            session.delete(order)
        session.flush()

        # Only the extra guests/sessions this seeder creates itself (tables 3
        # and 5) get removed -- the table-1 guests belong to guests.py.
        extra_token_hashes = {hash_device_token(token) for token, _table in EXTRA_GUESTS}
        extra_guests = session.scalars(
            select(Guest).where(Guest.device_token_hash.in_(extra_token_hashes))
        ).all()
        extra_session_ids = {guest.session_id for guest in extra_guests}

        deleted_guests_count = len(extra_guests)
        for guest in extra_guests:
            session.delete(guest)
        session.flush()

        deleted_sessions_count = 0
        for dining_session in session.scalars(
            select(DiningSession).where(DiningSession.id.in_(extra_session_ids))
        ).all():
            session.delete(dining_session)
            deleted_sessions_count += 1

        session.commit()

        print(f"{deleted_items_count} order items removidos.")
        print(f"{deleted_orders_count} orders vazias removidas.")
        print(f"{deleted_guests_count} guests extra removidos.")
        print(f"{deleted_sessions_count} dining sessions extra removidas.")


if __name__ == "__main__":
    import sys

    if "--reset" in sys.argv:
        reset_order_items()
    else:
        seed_order_items()
