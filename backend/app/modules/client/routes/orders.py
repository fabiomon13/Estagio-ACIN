# backend/app/modules/client/routes/orders.py

# backend/app/modules/client/routes/orders.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.buffet_item import BuffetItem
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.modules.client.dependencies import CurrentGuest
from app.modules.client.schemas import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
)


router = APIRouter(
    tags=["Client - Orders"],
)


ORDER_LOAD_OPTIONS = (
    selectinload(Order.items).selectinload(
        OrderItem.menu_item
    ),
    selectinload(Order.items).selectinload(
        OrderItem.status
    ),
)


@router.post(
    "/tables/{table_code}/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    table_code: str,
    order_data: OrderCreate,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    client_request_id = str(
        order_data.client_request_id
    )

    existing_order = find_order_by_request_id(
        db=db,
        guest_id=guest.id,
        client_request_id=client_request_id,
    )

    if existing_order is not None:
        return existing_order

    locked_guest = db.scalar(
        select(Guest)
        .where(Guest.id == guest.id)
        .with_for_update()
    )

    if locked_guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado",
        )

    pending_status = db.scalar(
        select(OrderItemStatus).where(
            OrderItemStatus.alias == "pending",
        )
    )

    if pending_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="O estado Pending não está configurado",
        )

    current_round = db.scalar(
        select(
            func.max(Order.round_number)
        ).where(
            Order.guest_id == locked_guest.id,
        )
    ) or 0

    order = Order(
        guest_id=locked_guest.id,
        round_number=current_round + 1,
        client_request_id=client_request_id,
    )

    db.add(order)

    try:
        db.flush()

        for requested_item in order_data.items:
            menu_item = db.get(
                MenuItem,
                requested_item.item_id,
            )

            if menu_item is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Artigo {requested_item.item_id} "
                        "não encontrado"
                    ),
                )

            if not menu_item.is_available:
                raise HTTPException(
                    status_code=(
                        status.HTTP_422_UNPROCESSABLE_ENTITY
                    ),
                    detail=(
                        f"Artigo {menu_item.name} "
                        "indisponível"
                    ),
                )

            if locked_guest.buffet_id is not None:
                buffet_item = db.get(
                    BuffetItem,
                    (
                        menu_item.id,
                        locked_guest.buffet_id,
                    ),
                )

                if buffet_item is None:
                    raise HTTPException(
                        status_code=(
                            status.HTTP_422_UNPROCESSABLE_ENTITY
                        ),
                        detail=(
                            f"Artigo {menu_item.id} "
                            "não pertence ao buffet"
                        ),
                    )

            order_item = OrderItem(
                item_id=menu_item.id,
                status_id=pending_status.id,
                quantity=requested_item.quantity,
                notes=requested_item.notes,
                unit_price=menu_item.base_price,
                unit_price_at_order=menu_item.base_price,
            )

            order.items.append(order_item)

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()

        existing_order = find_order_by_request_id(
            db=db,
            guest_id=locked_guest.id,
            client_request_id=client_request_id,
        )

        if existing_order is not None:
            return existing_order

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível criar o pedido",
        ) from exc

    return require_order_by_id(
        db=db,
        order_id=order.id,
        guest_id=locked_guest.id,
    )


@router.get(
    "/tables/{table_code}/orders",
    response_model=list[OrderResponse],
)
def get_orders(
    table_code: str,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> list[Order]:
    return list(
        db.scalars(
            select(Order)
            .options(*ORDER_LOAD_OPTIONS)
            .where(
                Order.guest_id == guest.id,
            )
            .order_by(
                Order.created_at.desc(),
            )
        ).all()
    )


@router.get(
    "/tables/{table_code}/orders/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    table_code: str,
    order_id: int,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    return require_order_by_id(
        db=db,
        order_id=order_id,
        guest_id=guest.id,
    )


@router.patch(
    (
        "/tables/{table_code}/orders/"
        "{order_id}/items/{item_id}/cancel"
    ),
    response_model=OrderItemResponse,
)
def cancel_order_item(
    table_code: str,
    order_id: int,
    item_id: int,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> OrderItem:
    order_item = db.scalar(
        select(OrderItem)
        .join(
            Order,
            Order.id == OrderItem.order_id,
        )
        .options(
            selectinload(OrderItem.menu_item),
            selectinload(OrderItem.status),
        )
        .where(
            Order.id == order_id,
            Order.guest_id == guest.id,
            OrderItem.id == item_id,
        )
        .with_for_update()
    )

    if order_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item do pedido não encontrado",
        )

    if order_item.status.alias != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Apenas itens pendentes "
                "podem ser cancelados"
            ),
        )

    cancelled_status = db.scalar(
        select(OrderItemStatus).where(
            OrderItemStatus.alias == "cancelled",
        )
    )

    if cancelled_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "O estado Cancelled "
                "não está configurado"
            ),
        )

    order_item.status_id = cancelled_status.id

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Não foi possível cancelar "
                "o item do pedido"
            ),
        ) from exc

    db.refresh(order_item)

    return order_item


def find_order_by_request_id(
    db: Session,
    guest_id: int,
    client_request_id: str,
) -> Order | None:
    return db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(
            Order.guest_id == guest_id,
            Order.client_request_id == client_request_id,
        )
    )


def require_order_by_id(
    db: Session,
    order_id: int,
    guest_id: int,
) -> Order:
    order = db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(
            Order.id == order_id,
            Order.guest_id == guest_id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado",
        )

    return order