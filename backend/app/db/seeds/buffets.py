#backend/app/db/seeds/buffets.py

from decimal import Decimal

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.buffet import Buffet


DEFAULT_BUFFET_NAME = "Buffet de Almoço"
DEFAULT_BUFFET_ALIAS = "buffet-almoco"
DEFAULT_BUFFET_PRICE = Decimal("19.90")
DEFAULT_WASTE_CHARGE = Decimal("5.00")


def seed_buffet() -> None:
    """Cria o buffet de almoço, se ainda não existir."""
    with SessionLocal() as session:
        existing_buffet = session.scalar(
            select(Buffet).where(
                Buffet.alias == DEFAULT_BUFFET_ALIAS
            )
        )

        if existing_buffet is not None:
            print(f"Buffet '{DEFAULT_BUFFET_NAME}' já existe.")
            return

        buffet = Buffet(
            name=DEFAULT_BUFFET_NAME,
            alias=DEFAULT_BUFFET_ALIAS,
            price=DEFAULT_BUFFET_PRICE,
            waste_charge=DEFAULT_WASTE_CHARGE,
        )

        session.add(buffet)
        session.commit()

        print(f"Buffet '{DEFAULT_BUFFET_NAME}' criado.")


if __name__ == "__main__":
    seed_buffet()
