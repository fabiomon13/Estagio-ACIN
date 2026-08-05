"""Runs every seeder in dependency order. Safe to re-run any time -- every
individual seeder checks what already exists before inserting, so this
never duplicates data.
"""

from app.db.seeds.buffet_items import seed_buffet_items
from app.db.seeds.buffets import seed_buffet
from app.db.seeds.categories import seed_categories
from app.db.seeds.dining_sessions import seed_dining_session
from app.db.seeds.guests import seed_guests
from app.db.seeds.menu_items import seed_menu_items
from app.db.seeds.order_item_statuses import seed_order_item_statuses
from app.db.seeds.order_items import seed_order_items
from app.db.seeds.orders import seed_orders
from app.db.seeds.restaurant_tables import seed_restaurant_table
from app.db.seeds.service_request_statuses import seed_service_request_statuses
from app.db.seeds.service_request_types import seed_service_request_types
from app.db.seeds.service_requests import seed_service_requests
from app.db.seeds.staff import seed_dev_admin, seed_dev_waiters
from app.db.seeds.staff_roles import seed_staff_roles
from app.db.seeds.stations import seed_stations
from app.db.seeds.tag_items import seed_tag_items
from app.db.seeds.tags import seed_tags

SEED_STEPS = [
    ("staff roles", seed_staff_roles),
    ("dev admin", seed_dev_admin),
    ("dev waiters", seed_dev_waiters),
    ("stations", seed_stations),
    ("categories", seed_categories),
    ("menu items", seed_menu_items),
    ("tags", seed_tags),
    ("tag items", seed_tag_items),
    ("order item statuses", seed_order_item_statuses),
    ("restaurant tables", seed_restaurant_table),
    ("buffets", seed_buffet),
    ("buffet items", seed_buffet_items),
    ("dining sessions", seed_dining_session),
    ("guests", seed_guests),
    ("service request statuses", seed_service_request_statuses),
    ("service request types", seed_service_request_types),
    ("service requests", seed_service_requests),
    ("orders (sample)", seed_orders),
    ("order items (kitchen test data)", seed_order_items),
]


def seed_all() -> None:
    for label, seed_fn in SEED_STEPS:
        print(f"--- {label} ---")
        seed_fn()


if __name__ == "__main__":
    seed_all()
