# backend/app/modules/client/routes/menu.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.buffet import Buffet
from app.models.buffet_item import BuffetItem
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.tag import Tag
from app.models.tag_item import TagItem
from app.modules.client.schemas import (
    BuffetResponse,
    CategoryResponse,
    MenuFilters,
    MenuItemPage,
    MenuItemResponse,
    TagResponse,
)
from app.modules.client.dependencies import DbSession

router = APIRouter(
    tags=["Client - Menu"],
)


MENU_ITEM_LOAD_OPTIONS = (
    selectinload(MenuItem.category),
    selectinload(MenuItem.tag_links).selectinload(
        TagItem.tag
    ),
)

def build_menu_query(filters: MenuFilters):
    query = select(MenuItem).options(*MENU_ITEM_LOAD_OPTIONS)

    if filters.search:
        search = filters.search.strip()

        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    MenuItem.name.ilike(pattern),
                    MenuItem.alias.ilike(pattern),
                    MenuItem.description.ilike(pattern),
                )
            )

    if filters.category_id is not None:
        query = query.where(
            MenuItem.category_id == filters.category_id
        )

    if filters.is_available is not None:
        query = query.where(
            MenuItem.is_available.is_(filters.is_available)
        )

    if filters.tag:
        query = query.join(
            TagItem,
            TagItem.menu_item_id == MenuItem.id,
        ).join(
            Tag,
            Tag.id == TagItem.tag_id,
        ).where(
            Tag.alias == filters.tag.strip().lower()
        )

    if filters.buffet_id is not None:
        query = query.join(
            BuffetItem,
            BuffetItem.menu_item_id == MenuItem.id,
        ).where(
            BuffetItem.buffet_id == filters.buffet_id
        )

    return query.distinct()

# Get buffets endpoint
@router.get(
    "/buffets",
    response_model=list[BuffetResponse],
)
def get_buffets(
    db: DbSession,
) -> list[Buffet]:
    return list(
        db.scalars(
            select(Buffet).order_by(Buffet.name)
        ).all()
    )

MenuQuery = Annotated[
    MenuFilters,
    Depends(),
]

# Get buffet items endpoint
@router.get(
    "/buffets/{buffet_id}/items",
    response_model=list[MenuItemResponse],
)
def get_buffet_items(
    buffet_id: int,
    db: DbSession,
) -> list[MenuItem]:
    buffet = db.get(Buffet, buffet_id)

    if buffet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet not found",
        )

    return list(
        db.scalars(
            select(MenuItem)
            .options(*MENU_ITEM_LOAD_OPTIONS)
            .join(
                BuffetItem,
                BuffetItem.menu_item_id == MenuItem.id,
            )
            .where(
                BuffetItem.buffet_id == buffet.id,
            )
            .order_by(MenuItem.name)
        ).all()
    )

# Get categories endpoint
@router.get(
    "/categories",
    response_model=list[CategoryResponse],
)
def get_categories(
    db: DbSession,
) -> list[Category]:
    return list(
        db.scalars(
            select(Category)
            .order_by(Category.name)
        ).all()
    )

# Get menu items endpoint
@router.get(
    "/menu-items",
    response_model=MenuItemPage,
)
def get_menu_items(
    filters: MenuQuery,
    db: DbSession,
) -> MenuItemPage:
    query = build_menu_query(filters)

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    items = list(
        db.scalars(
            query
            .order_by(MenuItem.name, MenuItem.id)
            .offset(filters.offset)
            .limit(filters.limit)
        ).all()
    )

    return MenuItemPage(
        items=items,
        total=total,
        limit=filters.limit,
        offset=filters.offset,
    )


@router.get(
    "/menu-items/{item_id}",
    response_model=MenuItemResponse,
)
def get_menu_item(
    item_id: int,
    db: DbSession,
) -> MenuItem:
    menu_item = db.scalar(
        select(MenuItem)
        .options(*MENU_ITEM_LOAD_OPTIONS)
        .where(MenuItem.id == item_id)
    )

    if menu_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artigo não encontrado",
        )

    return menu_item

@router.get(
    "/tags",
    response_model=list[TagResponse],
)
def get_tags(
    db: DbSession,
) -> list[Tag]:
    return list(
        db.scalars(
            select(Tag).order_by(Tag.name)
        ).all()
    )
