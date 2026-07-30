#backend/app/db/seeds/dining_sessions.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.dining_session import DiningSession
from app.models.restaurant_table import RestaurantTable


DEFAULT_TABLE_NUMBER = 1
DEFAULT_NUM_CLIENTS = 2


def seed_dining_session() -> None:
    """Cria uma sessão ativa para a mesa 1, se ainda não existir."""
    with SessionLocal() as session:
        restaurant_table = session.scalar(
            select(RestaurantTable).where(
                RestaurantTable.table_number == DEFAULT_TABLE_NUMBER
            )
        )

        if restaurant_table is None:
            raise RuntimeError(
                f"The table {DEFAULT_TABLE_NUMBER} was not found. "
                "Run the restaurant_tables seeder first."
            )

        if DEFAULT_NUM_CLIENTS > restaurant_table.max_capacity:
            raise RuntimeError(
                f"The number of clients ({DEFAULT_NUM_CLIENTS}) exceeds the table's capacity ({restaurant_table.max_capacity})."
            )

        existing_session = session.scalar(
            select(DiningSession).where(
                DiningSession.table_id == restaurant_table.id,
                DiningSession.is_active.is_(True),
            )
        )

        if existing_session is not None:
            print(f"The table {DEFAULT_TABLE_NUMBER} already has an active session.")
            return

        dining_session = DiningSession(
            table_id=restaurant_table.id,
            num_clients=DEFAULT_NUM_CLIENTS,
            is_active=True,
            is_approved=False,
        )

        session.add(dining_session)
        session.commit()

        print(
            f"Session created for table {DEFAULT_TABLE_NUMBER} "
            f"with {DEFAULT_NUM_CLIENTS} clients."
        )


if __name__ == "__main__":
    seed_dining_session()
