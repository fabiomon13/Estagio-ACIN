#backend/app/db/seeds/restaurant_tables.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.restaurant_table import RestaurantTable


DEFAULT_TABLE_NUMBERS = (1, 2, 3)
DEFAULT_TABLE_CAPACITY = 4


def seed_restaurant_table() -> None:
    """Garante a existência de três mesas com quatro lugares cada."""
    with SessionLocal() as session:
        existing_tables = session.scalars(
            select(RestaurantTable).where(
                RestaurantTable.table_number.in_(DEFAULT_TABLE_NUMBERS)
            )
        ).all()
        existing_tables_by_number = {
            table.table_number: table for table in existing_tables
        }

        created_tables = 0
        updated_tables = 0

        for table_number in DEFAULT_TABLE_NUMBERS:
            existing_table = existing_tables_by_number.get(table_number)

            if existing_table is None:
                session.add(
                    RestaurantTable(
                        table_number=table_number,
                        max_capacity=DEFAULT_TABLE_CAPACITY,
                    )
                )
                created_tables += 1
                continue

            if existing_table.max_capacity != DEFAULT_TABLE_CAPACITY:
                existing_table.max_capacity = DEFAULT_TABLE_CAPACITY
                updated_tables += 1

        session.commit()

        print(f"{created_tables} mesas criadas com {DEFAULT_TABLE_CAPACITY} lugares.")
        print(f"{updated_tables} mesas atualizadas para {DEFAULT_TABLE_CAPACITY} lugares.")


if __name__ == "__main__":
    seed_restaurant_table()
