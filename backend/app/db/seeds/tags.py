#backend/app/db/tags.py

import re
import unicodedata

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.tag import Tag


DEFAULT_TAG_NAMES = [
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


def make_alias(name: str) -> str:
    """Converte o nome apresentado num identificador ASCII estável."""
    normalized_name = unicodedata.normalize("NFKD", name)
    ascii_name = normalized_name.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


DEFAULT_TAGS = [
    (tag_name, make_alias(tag_name))
    for tag_name in DEFAULT_TAG_NAMES
]


def seed_tags() -> None:
    """Insere as tags predefinidas que ainda não existem."""
    tag_names = [
        tag_name
        for tag_name, _tag_alias in DEFAULT_TAGS
    ]

    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(Tag.name).where(
                    Tag.name.in_(tag_names)
                )
            ).all()
        )

        new_tags = [
            Tag(
                name=tag_name,
                alias=tag_alias,
            )
            for tag_name, tag_alias in DEFAULT_TAGS
            if tag_name not in existing_names
        ]

        session.add_all(new_tags)
        session.commit()

        print(f"{len(new_tags)} tags adicionadas.")


if __name__ == "__main__":
    seed_tags()
