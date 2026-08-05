#backend/app/db/seeds/restaurant_tables.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.restaurant_table import RestaurantTable


DEFAULT_TABLE_NUMBER = [1,2,3,4,5,6,7,8,9,10]
DEFAULT_TABLE_CAPACITY = 4


def seed_restaurant_table() -> None:
    """Garante a existência de três mesas com quatro lugares cada."""
    with SessionLocal() as session:
        existing_numbers =set(
            session.scalars(
                select(RestaurantTable.table_number)
                .where(RestaurantTable.table_number.in_(DEFAULT_TABLE_NUMBER))
            ).all()
        )

        to_create = [
            RestaurantTable(table_number=number, max_capacity=DEFAULT_TABLE_CAPACITY)
            for number in DEFAULT_TABLE_NUMBER
            if number not in existing_numbers
        ]

        if not to_create:
            print("Todas as mesas já existem.")
            return

        session.add_all(to_create)
        session.commit()

        print(f"{len(to_create)} mesa(s) criada(s).")

if __name__ == "__main__":
    seed_restaurant_table()
