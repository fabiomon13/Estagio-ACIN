# backend/app/modules/client/routes/menu.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
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
    MenuItemResponse,
)


router = APIRouter(
    tags=["Client - Menu"],
)


MENU_ITEM_LOAD_OPTIONS = (
    selectinload(MenuItem.category),
    selectinload(MenuItem.tag_links).selectinload(
        TagItem.tag
    ),
)

# Get buffets endpoint
@router.get(
    "/buffets",
    response_model=list[BuffetResponse],
)
def get_buffets(
    db: Annotated[Session, Depends(get_db)],
) -> list[Buffet]:
    return list(
        db.scalars(
            select(Buffet).order_by(Buffet.name)
        ).all()
    )

# Get buffet items endpoint
@router.get(
    "/buffets/{buffet_id}/items",
    response_model=list[MenuItemResponse],
)
def get_buffet_items(
    buffet_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[MenuItem]:
    buffet = db.get(Buffet, buffet_id)

    if buffet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet não encontrado",
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
    db: Annotated[Session, Depends(get_db)],
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
    response_model=list[MenuItemResponse],
)
def get_menu_items(
    db: Annotated[Session, Depends(get_db)],
    category_id: int | None = Query(
        default=None,
        gt=0,
    ),
    is_available: bool | None = Query(
        default=None,
    ),
    tag: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    buffet_id: int | None = Query(
        default=None,
        gt=0,
    ),
) -> list[MenuItem]:
    query = select(MenuItem).options(
        *MENU_ITEM_LOAD_OPTIONS
    )

    if category_id is not None:
        category = db.get(Category, category_id)

        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada",
            )

        query = query.where(
            MenuItem.category_id == category.id,
        )

    if is_available is not None:
        query = query.where(
            MenuItem.is_available.is_(is_available),
        )

    if tag is not None:
        existing_tag = db.scalar(
            select(Tag).where(
                Tag.alias == tag,
            )
        )

        if existing_tag is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag não encontrada",
            )

        query = (
            query
            .join(
                TagItem,
                TagItem.menu_item_id == MenuItem.id,
            )
            .where(
                TagItem.tag_id == existing_tag.id,
            )
        )

    if buffet_id is not None:
        buffet = db.get(Buffet, buffet_id)

        if buffet is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buffet não encontrado",
            )

        query = (
            query
            .join(
                BuffetItem,
                BuffetItem.menu_item_id == MenuItem.id,
            )
            .where(
                BuffetItem.buffet_id == buffet.id,
            )
        )

    query = query.distinct().order_by(
        MenuItem.name
    )

    return list(
        db.scalars(query).all()
    )