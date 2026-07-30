#backend/app/db/seeds/guests.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.buffet import Buffet
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.restaurant_table import RestaurantTable
from app.modules.client.security import hash_device_token


DEFAULT_TABLE_NUMBER = 1
DEFAULT_BUFFET_ALIAS = "buffet-almoco"

BUFFET_GUEST_TOKEN = "guest-with-buffet-device-token-001"
REGULAR_GUEST_TOKEN = "guest-without-buffet-device-token-002"


def seed_guests() -> None:
    """Cria dois convidados na sessão ativa da mesa 1."""
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

        dining_session = session.scalar(
            select(DiningSession).where(
                DiningSession.table_id == restaurant_table.id,
                DiningSession.is_active.is_(True),
            )
        )

        if dining_session is None:
            raise RuntimeError(
                f"The table {DEFAULT_TABLE_NUMBER} does not have an active session. "
                "Run the dining_sessions seeder first."
            )

        buffet = session.scalar(
            select(Buffet).where(
                Buffet.alias == DEFAULT_BUFFET_ALIAS
            )
        )

        if buffet is None:
            raise RuntimeError(
                f"Buffet '{DEFAULT_BUFFET_ALIAS}' not found. "
                "Run the buffets seeder first."
            )

        guest_data = [
            (BUFFET_GUEST_TOKEN, buffet.id),
            (REGULAR_GUEST_TOKEN, None),
        ]

        created_guests = 0

        for device_token, buffet_id in guest_data:
            token_hash = hash_device_token(device_token)
            existing_guest = session.scalar(
                select(Guest).where(
                    Guest.session_id == dining_session.id,
                    Guest.device_token_hash == token_hash,
                )
            )

            if existing_guest is not None:
                continue

            session.add(
                Guest(
                    session_id=dining_session.id,
                    buffet_id=buffet_id,
                    device_token_hash=token_hash,
                )
            )
            created_guests += 1

        session.commit()

        print(f"{created_guests} convidados adicionados à mesa 1.")
        print(f"Token do convidado com buffet: {BUFFET_GUEST_TOKEN}")
        print(f"Token do convidado sem buffet: {REGULAR_GUEST_TOKEN}")


if __name__ == "__main__":
    seed_guests()
