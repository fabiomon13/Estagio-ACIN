#backend/app/db/seeds/buffet_items.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.buffet import Buffet
from app.models.buffet_item import BuffetItem
from app.models.menu_item import MenuItem


DEFAULT_BUFFET_ALIAS = "buffet-almoco"

DEFAULT_BUFFET_ITEM_ALIASES = [
    "shrimp-tempura",
    "mixed-tempura",
    "sweet-potato-tempura",
    "soft-shell-crab-tempura",
    "squid-tempura",
    "vegetable-tempura",
    "chicken-ramen",
    "miso-ramen",
    "tonkotsu-ramen",
    "shoyu-ramen",
    "spicy-seafood-ramen",
    "veggie-ramen",
    "salmon-nigiri",
    "tuna-nigiri",
    "unagi-nigiri",
    "ebi-nigiri",
    "aburi-salmon-nigiri",
    "salmon-sashimi",
    "tuna-sashimi",
    "mix-sashimi-12",
    "seabass-sashimi",
    "salmon-uramaki", 
    "dragon-uramaki",  
    "ebi-fry-uramaki",
    "spicy-tuna-uramaki",
    "california-uramaki",
    "salmon-hosomaki",  
    "tuna-hosomaki",
    "kappa-hosomaki",
    "avocado-hosomaki",
]


def seed_buffet_items() -> None:
    """Associa ao buffet um item de cada categoria predefinida."""
    with SessionLocal() as session:
        buffet = session.scalar(
            select(Buffet).where(
                Buffet.alias == DEFAULT_BUFFET_ALIAS
            )
        )

        if buffet is None:
            raise RuntimeError(
                f"Buffet '{DEFAULT_BUFFET_ALIAS}' não encontrado. "
                "Corre o seeder buffets primeiro."
            )

        menu_items = session.scalars(
            select(MenuItem).where(
                MenuItem.alias.in_(DEFAULT_BUFFET_ITEM_ALIASES)
            )
        ).all()
        items_by_alias = {
            menu_item.alias: menu_item
            for menu_item in menu_items
        }

        missing_items = set(DEFAULT_BUFFET_ITEM_ALIASES) - items_by_alias.keys()
        if missing_items:
            missing_aliases = ", ".join(sorted(missing_items))
            raise RuntimeError(
                f"Itens não encontrados: {missing_aliases}. "
                "Corre o seeder menu_items primeiro."
            )

        existing_item_ids = set(
            session.scalars(
                select(BuffetItem.menu_item_id).where(
                    BuffetItem.buffet_id == buffet.id,
                )
            ).all()
        )

        new_links = [
            BuffetItem(
                buffet_id=buffet.id,
                menu_item_id=items_by_alias[item_alias].id,
            )
            for item_alias in DEFAULT_BUFFET_ITEM_ALIASES
            if items_by_alias[item_alias].id not in existing_item_ids
        ]

        session.add_all(new_links)
        session.commit()

        print(
            f"{len(new_links)} itens associados ao buffet "
            f"'{buffet.name}'."
        )


if __name__ == "__main__":
    seed_buffet_items()
