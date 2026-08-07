from decimal import Decimal

from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models.buffet_item import BuffetItem
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.order_item import OrderItem  # Adicionada esta importação


def _photo_url(alias: str) -> str:
    return f"/static/menu-items/{alias}.webp"


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
        "name": "Chá Verde Matcha Gelado",
        "alias": "iced-matcha-tea",
        "category_alias": "soft-drinks-water",
        "description": "Chá verde artesanal refrescante servido com gelo.",
        "price": Decimal("3.00"),
        "preparation_time": 2,
    },
    {
        "name": "Ramune Tradicional",
        "alias": "ramune-original",
        "category_alias": "soft-drinks-water",
        "description": "Refrigerante tradicional japonês na típica garrafa de berlinda.",
        "price": Decimal("3.50"),
        "preparation_time": 1,
    },
    {
        "name": "Água das Pedras (Com Gás)",
        "alias": "sparkling-water",
        "category_alias": "soft-drinks-water",
        "description": "Água mineral natural gaseificada (25cl).",
        "price": Decimal("1.80"),
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
        "name": "Cerveja Japonesa Kirin Ichiban",
        "alias": "kirin-beer",
        "category_alias": "alcoholic-drinks",
        "description": "Cerveja premium japonesa pura malte bem fresca (33cl).",
        "price": Decimal("4.00"),
        "preparation_time": 2,
    },
    {
        "name": "Sake Tradicional",
        "alias": "traditional-sake",
        "category_alias": "alcoholic-drinks",
        "description": "Bebida alcoólica de arroz servida em jarro de cerâmica, quente ou frio (150ml).",
        "price": Decimal("6.50"),
        "preparation_time": 3,
    },
    {
        "name": "Choya Plum Wine",
        "alias": "choya-plum-wine",
        "category_alias": "alcoholic-drinks",
        "description": "Vinho de ameixa doce e aromático servido com gelo e ameixa japonesa.",
        "price": Decimal("5.00"),
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
        "name": "Seleção de Mochis",
        "alias": "mochi-selection",
        "category_alias": "desserts",
        "description": "Bolinhos de arroz glutinoso recheados com gelado artesanal (2 unid.).",
        "price": Decimal("4.50"),
        "preparation_time": 3,
    },
    {
        "name": "Gelado de Chá Verde",
        "alias": "matcha-ice-cream",
        "category_alias": "desserts",
        "description": "Bola de gelado cremoso com sabor intenso a matcha artesanal.",
        "price": Decimal("4.00"),
        "preparation_time": 2,
    },
    {
        "name": "Dorayaki de Anko",
        "alias": "dorayaki",
        "category_alias": "desserts",
        "description": "Panqueca japonesa recheada com doce de feijão vermelho e calda de ácer.",
        "price": Decimal("4.50"),
        "preparation_time": 4,
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
        "name": "Tempura Misto",
        "alias": "mixed-tempura",
        "category_alias": "tempura",
        "description": "Combinação crocante de camarões e seleção de vegetais da época com molho tentsuyu.",
        "price": Decimal("11.00"),
        "preparation_time": 12,
    },
    {
        "name": "Tempura de Batata-Doce",
        "alias": "sweet-potato-tempura",
        "category_alias": "tempura",
        "description": "Fatias finas de batata-doce frita em massa leve e crocante de tempura.",
        "price": Decimal("6.50"),
        "preparation_time": 10,
    },
    {
        "name": "Tempura de Caranguejo de Concha Mole",
        "alias": "soft-shell-crab-tempura",
        "category_alias": "tempura",
        "description": "Caranguejo de concha mole crocante servido com molho ponzu e citrinos.",
        "price": Decimal("13.50"),
        "preparation_time": 14,
    },
    {
        "name": "Tempura de Lula",
        "alias": "squid-tempura",
        "category_alias": "tempura",
        "description": "Tiras de lula tenra crocante com molho de maionese spicy.",
        "price": Decimal("8.50"),
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
        "name": "Tonkotsu Ramen",
        "alias": "tonkotsu-ramen",
        "category_alias": "ramen",
        "description": "Caldo denso de porco, barriga de porco (chashu), ovo marinado, rebentos de feijão e cebolinho.",
        "price": Decimal("13.50"),
        "preparation_time": 15,
    },
    {
        "name": "Shoyu Ramen",
        "alias": "shoyu-ramen",
        "category_alias": "ramen",
        "description": "Caldo tradicional de molho de soja, chashu de porco, alga nori, naruto e cogumelos.",
        "price": Decimal("12.00"),
        "preparation_time": 15,
    },
    {
        "name": "Ramen de Marisco Picante",
        "alias": "spicy-seafood-ramen",
        "category_alias": "ramen",
        "description": "Caldo picante de peixe com camarão, lulas, mexilhão, massa e vegetais frescos.",
        "price": Decimal("14.50"),
        "preparation_time": 15,
    },
    {
        "name": "Ramen Vegetariano",
        "alias": "veggie-ramen",
        "category_alias": "ramen",
        "description": "Caldo rico de vegetais e miso, tofu grelhado, milho, espinafres e cogumelos shiitake.",
        "price": Decimal("11.00"),
        "preparation_time": 12,
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
        "name": "Nigiri de Salmão Braseado",
        "alias": "aburi-salmon-nigiri",
        "category_alias": "nigiri",
        "description": "Salmão ligeiramente braseado com molho teriyaki e flor de sal (2 unid.).",
        "price": Decimal("6.00"),
        "preparation_time": 6,
    },
    {
        "name": "Nigiri de Camarão",
        "alias": "ebi-nigiri",
        "category_alias": "nigiri",
        "description": "Camarão cozido sobre arroz de sushi temperado (2 unid.).",
        "price": Decimal("5.00"),
        "preparation_time": 5,
    },
    {
        "name": "Nigiri de Enguia",
        "alias": "unagi-nigiri",
        "category_alias": "nigiri",
        "description": "Enguia de água doce grelhada com molho doce de unagi (2 unid.).",
        "price": Decimal("7.00"),
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
    {
        "name": "Sashimi de Robalo",
        "alias": "seabass-sashimi",
        "category_alias": "sashimi",
        "description": "Fatias finas de peixe branco fresco com raspas de lima (5 unid.).",
        "price": Decimal("8.50"),
        "preparation_time": 5,
    },
    {
        "name": "Sashimi Variado (12 Peças)",
        "alias": "mix-sashimi-12",
        "category_alias": "sashimi",
        "description": "Seleção variada de 12 fatias de peixe fresco (salmão, atum e peixe branco).",
        "price": Decimal("16.00"),
        "preparation_time": 8,
    },
    
    {
        "name": "Spring Rolls",
        "alias": "spring-rolls",
        "category_alias": "starters", 
        "description": "Favas de soja cozidas a vapor com flor de sal.",
        "price": Decimal("4.00"),
        "preparation_time": 5,
        "photo_url": "/static/menu-items/edamame-beans.jpg",
    },
    {
        "name": "Edamame",
        "alias": "edamame",
        "category_alias": "starters",
        "description": "Vagens de soja cozidas a vapor finalizadas com flor de sal.",
        "price": Decimal("4.00"),
        "preparation_time": 4,
    },
    {
        "name": "Gyoza de Frango",
        "alias": "chicken-gyoza",
        "category_alias": "starters",
        "description": "Raviolis japoneses grelhados recheados com frango e vegetais (5 unid.).",
        "price": Decimal("6.00"),
        "preparation_time": 8,
    },
    {
        "name": "Gyoza Vegetariana",
        "alias": "veggie-gyoza",
        "category_alias": "starters",
        "description": "Raviolis japoneses grelhados recheados com vegetais (5 unid.).",
        "price": Decimal("5.50"),
        "preparation_time": 8,
    },
    {
        "name": "Sopa Miso",
        "alias": "miso-soup",
        "category_alias": "starters",
        "description": "Sopa tradicional de pasta de soja com tofu, algas wakame e cebolinho.",
        "price": Decimal("3.50"),
        "preparation_time": 3,
    },
    {
        "name": "Ebi Fry",
        "alias": "ebi-fry",
        "category_alias": "starters",
        "description": "Camarões panados em farinha panko crocante com molho sweet chili (4 unid.).",
        "price": Decimal("7.50"),
        "preparation_time": 8,
    },
    {
        "name": "Tartar de Salmão",
        "alias": "salmon-tartare",
        "category_alias": "starters",
        "description": "Salmão fresco picado com abacate, molho ponzu e ovas de massago.",
        "price": Decimal("9.00"),
        "preparation_time": 7,
    },
    {
        "name": "Takoyaki",
        "alias": "takoyaki",
        "category_alias": "starters",
        "description": "Bolinhas de massa japonesa recheadas com polvo e molho tonkatsu (4 unid.).",
        "price": Decimal("6.50"),
        "preparation_time": 8,
    },
    {
        "name": "Carpaccio de Salmão Trufado",
        "alias": "salmon-carpaccio",
        "category_alias": "starters",
        "description": "Fatias finas de salmão com molho ponzu, azeite de trufa e flor de sal.",
        "price": Decimal("9.50"),
        "preparation_time": 6,
    },
    {
        "name": "Salmon Uramaki",
        "alias": "salmon-uramaki",
        "category_alias": "uramaki",
        "description": "Rolo de caranguejo, abacate, pepino e sementes de sésamo.",
        "price": Decimal("8.50"),
        "preparation_time": 10,
        "photo_url": "/static/menu-items/california-roll.jpg",
    },
    {
        "name": "California Roll",
        "alias": "california-uramaki",
        "category_alias": "uramaki",
        "description": "Rolo invertido com delícias do mar, abacate, pepino e maionese japonesa (8 unid.).",
        "price": Decimal("7.50"),
        "preparation_time": 10,
    },
    {
        "name": "Spicy Tuna Roll",
        "alias": "spicy-tuna-uramaki",
        "category_alias": "uramaki",
        "description": "Atum picante, cebolinho, pepino e molho sriracha (8 unid.).",
        "price": Decimal("9.00"),
        "preparation_time": 10,
    },
    {
        "name": "Ebi Roll",
        "alias": "ebi-fry-uramaki",
        "category_alias": "uramaki",
        "description": "Camarão panado, abacate, molho teriyaki e sementes de sésamo (8 unid.).",
        "price": Decimal("9.50"),
        "preparation_time": 12,
    },
    {
        "name": "Dragon Roll",
        "alias": "dragon-uramaki",
        "category_alias": "uramaki",
        "description": "Camarão tempura no interior, coberto com abacate e molho unagi (8 unid.).",
        "price": Decimal("11.00"),
        "preparation_time": 12,
    },
    {
        "name": "Salmon Hosomaki",
        "alias": "salmon-hosomaki",
        "category_alias": "hosomaki",
        "description": "Rolo fino tradicional com pepino fresco.",
        "price": Decimal("4.50"),
        "preparation_time": 6,
        "photo_url": "/static/menu-items/kappa-maki.jpg",
    },
    {
        "name": "Hosomaki de Atum",
        "alias": "tuna-hosomaki",
        "category_alias": "hosomaki",
        "description": "Rolo fino tradicional de alga nori recheado com atum fresco (8 unid.).",
        "price": Decimal("5.00"),
        "preparation_time": 6,
    },
    {
        "name": "Hosomaki de Pepino",
        "alias": "kappa-hosomaki",
        "category_alias": "hosomaki",
        "description": "Rolo fino vegetariano com pepino crocante e sésamo (8 unid.).",
        "price": Decimal("3.50"),
        "preparation_time": 5,
    },
    {
        "name": "Hosomaki de Abacate",
        "alias": "avocado-hosomaki",
        "category_alias": "hosomaki",
        "description": "Rolo fino com recheio cremoso de abacate (8 unid.).",
        "price": Decimal("4.00"),
        "preparation_time": 5,
    },
]


def seed_menu_items() -> None:
    """Cria os itens de menu para cada categoria predefinida."""
    required_category_aliases = {
        item["category_alias"]
        for item in DEFAULT_MENU_ITEMS
    }

    with SessionLocal() as session:
    
        session.execute(delete(BuffetItem))
        session.execute(delete(OrderItem))
        
        session.execute(delete(MenuItem))
        session.commit()

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

            photo_url = _photo_url(item_data["alias"])

            if existing_item is not None:
                item_changed = False
                if existing_item.category_id != category.id:
                    existing_item.category_id = category.id
                    item_changed = True
                if existing_item.photo_url != photo_url:
                    existing_item.photo_url = photo_url
                    item_changed = True
                if item_changed:
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
                    photo_url=photo_url,
                )
            )
            created_items += 1

        session.commit()

        print(f"{created_items} itens de menu adicionados.")
        print(f"{updated_items} itens de menu atualizados.")


if __name__ == "__main__":
    seed_menu_items()