from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.restaurant_table import RestaurantTable


DEFAULT_TABLE_NUMBER = 1
DEFAULT_TABLE_CAPACITY = 4


def seed_restaurant_table() -> None:
    """Cria uma mesa de quatro lugares, se ainda não existir."""
    with SessionLocal() as session:
        existing_table = session.scalar(
            select(RestaurantTable).where(
                RestaurantTable.table_number == DEFAULT_TABLE_NUMBER
            )
        )

        if existing_table is not None:
            print(f"Mesa {DEFAULT_TABLE_NUMBER} já existe.")
            return

        restaurant_table = RestaurantTable(
            table_number=DEFAULT_TABLE_NUMBER,
            max_capacity=DEFAULT_TABLE_CAPACITY,
        )

        session.add(restaurant_table)
        session.commit()

        print(
            f"Mesa {DEFAULT_TABLE_NUMBER} criada com "
            f"{DEFAULT_TABLE_CAPACITY} lugares."
        )


if __name__ == "__main__":
    seed_restaurant_table()
