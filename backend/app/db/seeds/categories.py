#backend/app/db/seeds/categories.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.category import Category
from app.models.station import Station


DEFAULT_CATEGORIES = [
    ("Soft Drinks & Water", "soft-drinks-water", "bar"),
    ("Alcoholic Drinks", "alcoholic-drinks", "bar"),
    ("Desserts", "desserts", "cold-pantry"),
    ("Tempura", "tempura", "fryer"),
    ("Ramen", "ramen", "hot-wok"),
    ("Nigiri", "nigiri", "sushi-bar"),
    ("Sashimi", "sashimi", "sushi-bar"),
]


def seed_categories() -> None:
    """Cria as categorias e associa-as às respetivas stations."""
    required_station_aliases = {
        station_alias
        for _name, _alias, station_alias in DEFAULT_CATEGORIES
    }

    with SessionLocal() as session:
        stations = session.scalars(
            select(Station).where(
                Station.alias.in_(required_station_aliases)
            )
        ).all()
        stations_by_alias = {
            station.alias: station
            for station in stations
        }

        missing_stations = required_station_aliases - stations_by_alias.keys()
        if missing_stations:
            missing_aliases = ", ".join(sorted(missing_stations))
            raise RuntimeError(
                f"Stations não encontradas: {missing_aliases}. "
                "Corre o seeder stations primeiro."
            )

        category_aliases = [
            category_alias
            for _name, category_alias, _station_alias in DEFAULT_CATEGORIES
        ]
        existing_categories = session.scalars(
            select(Category).where(
                Category.alias.in_(category_aliases)
            )
        ).all()
        categories_by_alias = {
            category.alias: category
            for category in existing_categories
        }

        created_categories = 0
        updated_categories = 0

        for category_name, category_alias, station_alias in DEFAULT_CATEGORIES:
            station = stations_by_alias[station_alias]
            existing_category = categories_by_alias.get(category_alias)

            if existing_category is not None:
                if existing_category.station_id != station.id:
                    existing_category.station_id = station.id
                    updated_categories += 1
                continue

            session.add(
                Category(
                    name=category_name,
                    alias=category_alias,
                    station_id=station.id,
                )
            )
            created_categories += 1

        session.commit()

        print(f"{created_categories} categorias adicionadas.")
        print(f"{updated_categories} categorias atualizadas.")


if __name__ == "__main__":
    seed_categories()
