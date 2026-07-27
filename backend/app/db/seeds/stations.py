from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.station import Station


DEFAULT_STATIONS = [
    ("Bar", "bar"),
    ("Cold/Pantry", "cold-pantry"),
    ("Fryer", "fryer"),
    ("Hot/Wok", "hot-wok"),
    ("Sushi Bar", "sushi-bar"),
]


def seed_stations() -> None:
    """Insere as estações de preparação que ainda não existem."""
    station_aliases = [
        station_alias
        for _station_name, station_alias in DEFAULT_STATIONS
    ]

    with SessionLocal() as session:
        existing_aliases = set(
            session.scalars(
                select(Station.alias).where(
                    Station.alias.in_(station_aliases)
                )
            ).all()
        )

        new_stations = [
            Station(
                name=station_name,
                alias=station_alias,
            )
            for station_name, station_alias in DEFAULT_STATIONS
            if station_alias not in existing_aliases
        ]

        session.add_all(new_stations)
        session.commit()

        print(f"{len(new_stations)} estações adicionadas.")


if __name__ == "__main__":
    seed_stations()
