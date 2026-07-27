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
    "beer": [
        "alergenio-gluten",
    ],
    "house-red-wine": [
        "alergenio-sulfitos",
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
    "shrimp-tempura": [
        "alergenio-gluten",
        "alergenio-crustaceos",
        "alergenio-ovos",
    ],
    "vegetable-tempura": [
        "vegetariano",
        "alergenio-gluten",
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
    "salmon-nigiri": [
        "alergenio-peixe",
    ],
    "tuna-nigiri": [
        "alergenio-peixe",
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
