#backend/app/db/tags.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.tag import Tag


DEFAULT_TAGS = [
    # Preferências e intolerâncias
    "Vegetariano",
    "Vegan",
    "Sem glúten",
    "Sem lactose",

    # Alergénios
    "Alergénio: glúten",
    "Alergénio: crustáceos",
    "Alergénio: ovos",
    "Alergénio: peixe",
    "Alergénio: amendoins",
    "Alergénio: soja",
    "Alergénio: leite",
    "Alergénio: frutos de casca rija",
    "Alergénio: aipo",
    "Alergénio: mostarda",
    "Alergénio: sésamo",
    "Alergénio: sulfitos",
    "Alergénio: tremoço",
    "Alergénio: moluscos",
]


def seed_tags() -> None:
    """Insere as tags predefinidas que ainda não existem."""
    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(Tag.name).where(Tag.name.in_(DEFAULT_TAGS))
            ).all()
        )

        new_tags = [
            Tag(name=tag_name)
            for tag_name in DEFAULT_TAGS
            if tag_name not in existing_names
        ]

        session.add_all(new_tags)
        session.commit()

        print(f"{len(new_tags)} tags adicionadas.")


if __name__ == "__main__":
    seed_tags()