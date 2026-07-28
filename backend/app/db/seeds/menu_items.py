from decimal import Decimal

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.category import Category
from app.models.menu_item import MenuItem


DEFAULT_MENU_ITEMS = [
    {
        "name": "Still Water",
        "alias": "still-water",
        "category_alias": "soft-drinks-water",
        "description": "Still mineral water.",
        "price": Decimal("1.50"),
        "preparation_time": 1,
    },
    {
        "name": "Coca-Cola",
        "alias": "coca-cola",
        "category_alias": "soft-drinks-water",
        "description": "Chilled Coca-Cola.",
        "price": Decimal("2.50"),
        "preparation_time": 1,
    },
    {
        "name": "Beer",
        "alias": "beer",
        "category_alias": "alcoholic-drinks",
        "description": "Chilled house beer.",
        "price": Decimal("3.50"),
        "preparation_time": 2,
    },
    {
        "name": "House Red Wine",
        "alias": "house-red-wine",
        "category_alias": "alcoholic-drinks",
        "description": "Glass of house red wine.",
        "price": Decimal("4.00"),
        "preparation_time": 2,
    },
    {
        "name": "Chocolate Mousse",
        "alias": "chocolate-mousse",
        "category_alias": "desserts",
        "description": "Creamy chocolate mousse.",
        "price": Decimal("4.50"),
        "preparation_time": 3,
    },
    {
        "name": "Cheesecake",
        "alias": "cheesecake",
        "category_alias": "desserts",
        "description": "Cheesecake with red fruit sauce.",
        "price": Decimal("5.00"),
        "preparation_time": 3,
    },
    {
        "name": "Shrimp Tempura",
        "alias": "shrimp-tempura",
        "category_alias": "tempura",
        "description": "Crispy shrimp tempura.",
        "price": Decimal("9.50"),
        "preparation_time": 12,
    },
    {
        "name": "Vegetable Tempura",
        "alias": "vegetable-tempura",
        "category_alias": "tempura",
        "description": "Assorted crispy vegetable tempura.",
        "price": Decimal("7.50"),
        "preparation_time": 10,
    },
    {
        "name": "Chicken Ramen",
        "alias": "chicken-ramen",
        "category_alias": "ramen",
        "description": "Ramen with chicken and vegetables.",
        "price": Decimal("12.50"),
        "preparation_time": 15,
    },
    {
        "name": "Miso Ramen",
        "alias": "miso-ramen",
        "category_alias": "ramen",
        "description": "Ramen served in a rich miso broth.",
        "price": Decimal("11.50"),
        "preparation_time": 15,
    },
    {
        "name": "Salmon Nigiri",
        "alias": "salmon-nigiri",
        "category_alias": "nigiri",
        "description": "Salmon over seasoned sushi rice.",
        "price": Decimal("5.50"),
        "preparation_time": 6,
    },
    {
        "name": "Tuna Nigiri",
        "alias": "tuna-nigiri",
        "category_alias": "nigiri",
        "description": "Tuna over seasoned sushi rice.",
        "price": Decimal("6.00"),
        "preparation_time": 6,
    },
    {
        "name": "Salmon Sashimi",
        "alias": "salmon-sashimi",
        "category_alias": "sashimi",
        "description": "Fresh salmon sashimi slices.",
        "price": Decimal("8.50"),
        "preparation_time": 5,
    },
    {
        "name": "Tuna Sashimi",
        "alias": "tuna-sashimi",
        "category_alias": "sashimi",
        "description": "Fresh tuna sashimi slices.",
        "price": Decimal("9.00"),
        "preparation_time": 5,
    },
]


def seed_menu_items() -> None:
    """Cria dois itens de menu para cada categoria predefinida."""
    required_category_aliases = {
        item["category_alias"]
        for item in DEFAULT_MENU_ITEMS
    }

    with SessionLocal() as session:
        categories = session.scalars(
            select(Category).where(
                Category.alias.in_(required_category_aliases)
            )
        ).all()
        categories_by_alias = {
            category.alias: category
            for category in categories
        }

        missing_categories = required_category_aliases - categories_by_alias.keys()
        if missing_categories:
            missing_aliases = ", ".join(sorted(missing_categories))
            raise RuntimeError(
                f"Categorias não encontradas: {missing_aliases}. "
                "Corre o seeder categories primeiro."
            )

        item_aliases = [
            item["alias"]
            for item in DEFAULT_MENU_ITEMS
        ]
        existing_items = session.scalars(
            select(MenuItem).where(
                MenuItem.alias.in_(item_aliases)
            )
        ).all()
        items_by_alias = {
            item.alias: item
            for item in existing_items
        }

        created_items = 0
        updated_items = 0

        for item_data in DEFAULT_MENU_ITEMS:
            category = categories_by_alias[item_data["category_alias"]]
            existing_item = items_by_alias.get(item_data["alias"])

            if existing_item is not None:
                if existing_item.category_id != category.id:
                    existing_item.category_id = category.id
                    updated_items += 1
                continue

            session.add(
                MenuItem(
                    category_id=category.id,
                    name=item_data["name"],
                    alias=item_data["alias"],
                    description=item_data["description"],
                    base_price=item_data["price"],
                    base_preparation_time=item_data["preparation_time"],
                )
            )
            created_items += 1

        session.commit()

        print(f"{created_items} itens de menu adicionados.")
        print(f"{updated_items} itens de menu atualizados.")


if __name__ == "__main__":
    seed_menu_items()
