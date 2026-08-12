import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.restaurant_table import RestaurantTable
from app.models.staff import Staff
from app.models.staff_role import StaffRole
from app.modules.client.security import hash_device_token

LISBON = ZoneInfo("Europe/Lisbon")

HISTORY_ROUNDS = [
    (1, 13, 2, [("salmon-nigiri", 2, "served"), ("beer", 1, "served")]),
    (1, 20, 4, [("miso-ramen", 1, "served"), ("chocolate-mousse", 1, "served")]),
    (2, 13, 3, [("shrimp-tempura", 1, "served"), ("salmon-nigiri", 1, "cancelled")]),
    (2, 21, 5, [("miso-ramen", 2, "served"), ("beer", 2, "served")]),
    (3, 13, 6, [("chocolate-mousse", 1, "served"), ("shrimp-tempura", 1, "served")]),
    (3, 20, 2, [("salmon-nigiri", 3, "served")]),
    (4, 13, 4, [("miso-ramen", 1, "served"), ("shrimp-tempura", 1, "returned")]),
    (4, 19, 3, [("beer", 2, "served"), ("chocolate-mousse", 2, "served")]),
    (5, 13, 5, [("salmon-nigiri", 2, "served"), ("miso-ramen", 1, "served")]),
    (5, 20, 6, [("shrimp-tempura", 2, "served"), ("beer", 1, "cancelled")]),
    (6, 13, 7, [("tonkotsu-ramen", 1, "served"), ("edamame", 1, "served")]),
    (6, 19, 8, [("tuna-sashimi", 1, "served"), ("house-red-wine", 1, "served")]),
    (7, 13, 9, [("chicken-gyoza", 2, "served"), ("cheesecake", 1, "served")]),
    (7, 20, 10, [("spicy-tuna-uramaki", 1, "served"), ("kirin-beer", 1, "served")]),
    (8, 12, 1, [("veggie-ramen", 1, "served"), ("mochi-selection", 1, "served")]),
    (8, 19, 7, [("aburi-salmon-nigiri", 2, "served"), ("miso-soup", 1, "served")]),
    (9, 13, 8, [("mix-sashimi-12", 1, "served"), ("traditional-sake", 1, "served")]),
    (9, 21, 9, [("takoyaki", 1, "cancelled"), ("dragon-uramaki", 1, "served")]),
    (10, 13, 10, [("salmon-carpaccio", 1, "served"), ("matcha-ice-cream", 1, "served")]),
    (10, 20, 1, [("soft-shell-crab-tempura", 1, "returned"), ("dorayaki", 1, "served")]),
    # Extra rounds appended (not inserted above) so existing rows stay keyed
    # to the same round_index on a re-seed -- these pile more items onto day
    # 1 specifically, so filtering the Kitchen History page to just
    # "yesterday" is enough to see pagination kick in (18 items > PAGE_SIZE).
    (1, 9, 8, [("edamame", 1, "served"), ("still-water", 2, "served")]),
    (1, 10, 5, [("chicken-ramen", 1, "served"), ("cheesecake", 1, "served")]),
    (1, 11, 3, [("tuna-nigiri", 2, "served"), ("sparkling-water", 1, "served")]),
    (1, 12, 9, [("veggie-gyoza", 2, "served"), ("ramune-original", 1, "served")]),
    (1, 14, 7, [("spring-rolls", 1, "served"), ("iced-matcha-tea", 1, "served")]),
    (1, 15, 10, [("ebi-nigiri", 2, "cancelled"), ("choya-plum-wine", 1, "served")]),
    (1, 16, 6, [("salmon-uramaki", 1, "served"), ("dorayaki", 1, "returned")]),
]


def _local_datetime(days_ago: int, hour: int) -> datetime:
    target_day = (datetime.now(LISBON) - timedelta(days=days_ago)).date()
    return datetime(target_day.year, target_day.month, target_day.day, hour, 0, tzinfo=LISBON)


def _all_waiters(session: Session) -> list[Staff]:
    waiters = list(
        session.scalars(
            select(Staff)
            .join(StaffRole, Staff.staff_role_id == StaffRole.id)
            .where(func.lower(StaffRole.alias) == "waiter")
            .order_by(Staff.id)
        )
    )
    if not waiters:
        raise RuntimeError("No waiter staff found. Run the staff seeder first.")
    return waiters


def seed_order_history() -> None:
    """Backfills closed rounds (Served/Cancelled/Returned) on past dates for
    the Kitchen History page. Every session created here is already inactive
    (is_active=False), so none of this shows up as a live table -- safe to
    run on a presentation database, unlike order_items.py's live demo data."""
    with SessionLocal() as session:
        waiters = _all_waiters(session)

        tables_by_number = {
            table.table_number: table for table in session.scalars(select(RestaurantTable)).all()
        }

        statuses_by_alias = {
            status.alias: status for status in session.scalars(select(OrderItemStatus)).all()
        }

        item_aliases = {alias for _, _, _, items in HISTORY_ROUNDS for alias, _, _ in items}
        menu_items_by_alias = {
            item.alias: item
            for item in session.scalars(
                select(MenuItem).where(MenuItem.alias.in_(item_aliases))
            ).all()
        }

        missing_items = item_aliases - menu_items_by_alias.keys()
        if missing_items:
            raise RuntimeError(
                f"Itens não encontrados: {', '.join(sorted(missing_items))}. "
                "Corre o seeder menu_items primeiro."
            )

        created_items = 0

        for round_index, (days_ago, hour, table_number, items) in enumerate(HISTORY_ROUNDS):
            table = tables_by_number.get(table_number)
            if table is None:
                raise RuntimeError(
                    f"Mesa {table_number} não encontrada. Corre o seeder restaurant_tables primeiro."
                )

            token_hash = hash_device_token(f"history-seed-round-{round_index}")

            existing_guest = session.scalar(select(Guest).where(Guest.device_token_hash == token_hash))
            if existing_guest is not None:
                continue

            when = _local_datetime(days_ago, hour)
            waiter = waiters[round_index % len(waiters)]

            dining_session = DiningSession(
                table_id=table.id,
                num_clients=1,
                is_active=False,
                is_approved=True,
                approved_at=when,
                waiter_id=waiter.id,
                start_time=when,
                end_time=when + timedelta(minutes=45),
            )
            session.add(dining_session)
            session.flush()

            guest = Guest(
                session_id=dining_session.id,
                buffet_id=None,
                device_token_hash=token_hash,
                created_at=when,
            )
            session.add(guest)
            session.flush()

            order = Order(
                guest_id=guest.id,
                round_number=1,
                client_request_id=str(uuid.uuid4()),
                created_at=when,
            )
            session.add(order)
            session.flush()

            for item_alias, quantity, status_alias in items:
                menu_item = menu_items_by_alias[item_alias]
                status = statuses_by_alias[status_alias]

                session.add(
                    OrderItem(
                        order_id=order.id,
                        item_id=menu_item.id,
                        status_id=status.id,
                        quantity=quantity,
                        unit_price=menu_item.base_price,
                        unit_price_at_order=menu_item.base_price,
                        created_at=when,
                        updated_at=when,
                    )
                )
                created_items += 1

        session.commit()

        print(f"{created_items} order items de histórico adicionados.")


if __name__ == "__main__":
    seed_order_history()
