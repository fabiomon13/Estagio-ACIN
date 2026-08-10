#backend/app/db/seeds/tag_items.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.menu_item import MenuItem
from app.models.tag import Tag
from app.models.tag_item import TagItem


DEFAULT_ITEM_TAGS = {
    "still-water": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
    ],
    "coca-cola": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
    ],
    "iced-matcha-tea": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
    ],
    "ramune-original": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
    ],
    "sparkling-water": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
    ],
    "beer": [
        "alergenio-gluten",
    ],
    "traditional-sake": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
    ],
    "choya-plum-wine": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
        "alergenio-sulfitos",
    ],
    "house-red-wine": [
        "alergenio-sulfitos",
    ],
    "kirin-beer": [
        "alergenio-gluten",
    ],
    "chocolate-mousse": [
        "vegetariano",
        "alergenio-ovos",
        "alergenio-leite",
    ],
    "cheesecake": [
        "vegetariano",
        "alergenio-gluten",
        "alergenio-ovos",
        "alergenio-leite",
    ],
    "mochi-selection": [
        "vegetariano",
        "sem-gluten",
        "alergenio-leite",
    ],
    "matcha-ice-cream": [
        "vegetariano",
        "sem-gluten",
        "alergenio-leite",
    ],
    "dorayaki": [
        "vegetariano",
        "alergenio-gluten",
        "alergenio-ovos",
    ],
    "shrimp-tempura": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-ovos",
    ],
    "vegetable-tempura": [
        "vegetariano",
        "alergenio-gluten",
    ],
    "mixed-tempura": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-ovos",
    ],
    "sweet-potato-tempura": [
        "vegetariano",
        "alergenio-gluten",
    ],
    "soft-shell-crab-tempura": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-ovos",
        "alergenio-soja",
    ],
    "squid-tempura": [
        "alergenio-gluten",
        "alergenio-moluscos",
        "alergenio-ovos",
    ],
    "chicken-ramen": [
        "alergenio-gluten",
        "alergenio-ovos",
        "alergenio-soja",
    ],
    "miso-ramen": [
        "vegetariano",
        "alergenio-gluten",
        "alergenio-soja",
    ],
    "tonkotsu-ramen": [
        "alergenio-gluten",
        "alergenio-ovos",
        "alergenio-soja",
    ],
    "shoyu-ramen": [
        "alergenio-gluten",
        "alergenio-ovos",
        "alergenio-soja",
    ],
    "spicy-seafood-ramen": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-peixe",
        "alergenio-moluscos",
        "alergenio-soja",
    ],
    "veggie-ramen": [
        "vegetariano",
        "vegan",
        "alergenio-gluten",
        "alergenio-soja",
    ],
    "salmon-nigiri": [
        "alergenio-peixe",
    ],
    "tuna-nigiri": [
        "alergenio-peixe",
    ],
    "aburi-salmon-nigiri": [
        "alergenio-peixe",
        "alergenio-soja",
        "alergenio-gluten",
    ],
    "ebi-nigiri": [
        "alergenio-crustaceos",
    ],
    "unagi-nigiri": [
        "alergenio-peixe",
        "alergenio-soja",
        "alergenio-gluten",
    ],
    "salmon-sashimi": [
        "sem-gluten",
        "sem-lactose",
        "alergenio-peixe",
    ],
    "tuna-sashimi": [
        "sem-gluten",
        "sem-lactose",
        "alergenio-peixe",
    ],
    "seabass-sashimi": [
        "sem-gluten",
        "sem-lactose",
        "alergenio-peixe",
    ],
    "mix-sashimi-12": [
        "sem-gluten",
        "sem-lactose",
        "alergenio-peixe",
    ],
    "spring-rolls": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
        "alergenio-soja",
    ],
    "edamame": [
        "vegetariano",
        "vegan",
        "sem-gluten",
        "sem-lactose",
        "alergenio-soja",
    ],
    "chicken-gyoza": [
        "alergenio-gluten",
        "alergenio-soja",
        "alergenio-sesamo",
    ],
    "veggie-gyoza": [
        "vegetariano",
        "alergenio-gluten",
        "alergenio-soja",
    ],
    "miso-soup": [
        "vegetariano",
        "sem-lactose",
        "alergenio-soja",
    ],
    "ebi-fry": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-ovos",
    ],
    "salmon-tartare": [
        "alergenio-peixe",
        "alergenio-soja",
    ],
    "takoyaki": [
        "alergenio-gluten",
        "alergenio-moluscos",
        "alergenio-ovos",
        "alergenio-soja",
    ],
    "salmon-carpaccio": [
        "alergenio-peixe",
        "alergenio-soja",
    ],
    "salmon-uramaki": [
        "alergenio-peixe",
        "alergenio-crustaceos",
        "alergenio-sesamo",
    ],
    "california-uramaki": [
        "alergenio-crustaceos",
        "alergenio-ovos",
        "alergenio-sesamo",
        "alergenio-gluten",
    ],
    "spicy-tuna-uramaki": [
        "alergenio-peixe",
        "alergenio-sesamo",
    ],
    "ebi-fry-uramaki": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-soja",
        "alergenio-sesamo",
    ],
    "dragon-uramaki": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-soja",
        "alergenio-sesamo",
    ],
    "salmon-hosomaki": [
        "alergenio-peixe",
    ],
    "tuna-hosomaki": [
        "alergenio-peixe",
    ],
    "kappa-hosomaki": [
        "vegetariano",
        "vegan",
        "sem-lactose",
        "alergenio-sesamo",
    ],
    "avocado-hosomaki": [
        "vegetariano",
        "vegan",
        "sem-lactose",
    ],
}



def seed_tag_items() -> None:
    """Associa as tags alimentares e alergénios aos itens do menu."""
    required_item_aliases = set(DEFAULT_ITEM_TAGS)
    required_tag_aliases = {
        tag_alias
        for tag_aliases in DEFAULT_ITEM_TAGS.values()
        for tag_alias in tag_aliases
    }

    with SessionLocal() as session:
        menu_items = session.scalars(
            select(MenuItem).where(
                MenuItem.alias.in_(required_item_aliases)
            )
        ).all()
        items_by_alias = {
            menu_item.alias: menu_item
            for menu_item in menu_items
        }

        missing_items = required_item_aliases - items_by_alias.keys()
        if missing_items:
            raise RuntimeError(
                "Itens não encontrados: "
                f"{', '.join(sorted(missing_items))}. "
                "Corre o seeder menu_items primeiro."
            )

        tags = session.scalars(
            select(Tag).where(
                Tag.alias.in_(required_tag_aliases)
            )
        ).all()
        tags_by_alias = {
            tag.alias: tag
            for tag in tags
        }

        missing_tags = required_tag_aliases - tags_by_alias.keys()
        if missing_tags:
            raise RuntimeError(
                "Tags não encontradas: "
                f"{', '.join(sorted(missing_tags))}. "
                "Corre o seeder tags primeiro."
            )

        existing_links = set(
            session.execute(
                select(
                    TagItem.menu_item_id,
                    TagItem.tag_id,
                )
            ).all()
        )

        new_links = []
        for item_alias, tag_aliases in DEFAULT_ITEM_TAGS.items():
            menu_item = items_by_alias[item_alias]

            for tag_alias in tag_aliases:
                tag = tags_by_alias[tag_alias]
                link_key = (menu_item.id, tag.id)

                if link_key in existing_links:
                    continue

                new_links.append(
                    TagItem(
                        menu_item_id=menu_item.id,
                        tag_id=tag.id,
                    )
                )

        session.add_all(new_links)
        session.commit()

        print(f"{len(new_links)} associações entre itens e tags adicionadas.")


if __name__ == "__main__":
    seed_tag_items()
