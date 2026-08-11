"""One-off cleanup for a presentation/demo database branch.

Deletes every dining session and everything that hangs off it (guests,
orders, order items, service requests, payments -- all via ON DELETE
CASCADE), leaving catalog data (menu, categories, staff, stations, tags)
untouched. Run this BEFORE seed_catalog() on a database you don't mind
wiping transactional data from.

Never run this against a database with real activity you want to keep --
there is no undo.
"""

import sys

from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.dining_session import DiningSession


def wipe_transactional_data() -> None:
    with SessionLocal() as session:
        count = session.scalar(select(func.count()).select_from(DiningSession))
        session.query(DiningSession).delete()
        session.commit()

        print(
            f"{count} dining sessions removed (guests, orders, order items, "
            "service requests and payments cascaded with them)."
        )


if __name__ == "__main__":
    if "--yes" not in sys.argv:
        print(
            "This will DELETE every dining session -- and everything hanging "
            f"off it -- from:\n\n  {settings.database_url}\n"
        )
        print("Re-run with --yes to confirm.")
        sys.exit(1)

    wipe_transactional_data()
