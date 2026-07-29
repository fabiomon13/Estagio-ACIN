# backend/app/modules/client/routes/menu.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    MenuItemPage,
    MenuItemResponse,
    TagResponse,
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
    response_model=MenuItemPage,
)
def get_menu_items(
    db: Annotated[Session, Depends(get_db)],
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
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
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> MenuItemPage:
    query = select(MenuItem).options(
        *MENU_ITEM_LOAD_OPTIONS
    )

    # Search by name, alias or description
    if search is not None:
        normalized_search = search.strip()

        query = query.where(
            or_(
                MenuItem.name.ilike(
                    f"%{normalized_search}%"
                ),
                MenuItem.alias.ilike(
                    f"%{normalized_search}%"
                ),
                MenuItem.description.ilike(
                    f"%{normalized_search}%"
                ),
            )
        )

    # Search by category
    if category_id is not None:
        category = db.get(
            Category,
            category_id,
        )

        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada",
            )

        query = query.where(
            MenuItem.category_id == category.id,
        )

    # Filtro por disponibilidade
    if is_available is not None:
        query = query.where(
            MenuItem.is_available.is_(
                is_available
            ),
        )

    # Filtro por tag
    if tag is not None:
        normalized_tag = tag.strip().lower()

        existing_tag = db.scalar(
            select(Tag).where(
                Tag.alias == normalized_tag,
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
                TagItem.menu_item_id
                == MenuItem.id,
            )
            .where(
                TagItem.tag_id
                == existing_tag.id,
            )
        )

    # Filtro por buffet
    if buffet_id is not None:
        buffet = db.get(
            Buffet,
            buffet_id,
        )

        if buffet is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buffet não encontrado",
            )

        query = (
            query
            .join(
                BuffetItem,
                BuffetItem.menu_item_id
                == MenuItem.id,
            )
            .where(
                BuffetItem.buffet_id
                == buffet.id,
            )
        )

    query = query.distinct()

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    paginated_query = (
        query
        .order_by(MenuItem.name)
        .offset(offset)
        .limit(limit)
    )

    items = list(
        db.scalars(paginated_query).all()
    )

    return MenuItemPage(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/menu-items/{item_id}",
    response_model=MenuItemResponse,
)
def get_menu_item(
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
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
    db: Annotated[Session, Depends(get_db)],
) -> list[Tag]:
    return list(
        db.scalars(
            select(Tag).order_by(Tag.name)
        ).all()
    )
