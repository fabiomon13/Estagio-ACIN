from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.modules.staff.websockets.staff_realtime import broadcast_staff_dashboard

from app.models.buffet_item import BuffetItem
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.modules.client.dependencies import CurrentGuest, DbSession
from app.modules.client.realtime import publish_guest_event
from app.modules.client.schemas import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
)
from app.modules.kitchen.service import broadcast_active_tickets


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


def require_order_status(
    db: Session,
    alias: str,
) -> OrderItemStatus:
    order_status = db.scalar(
        select(OrderItemStatus).where(
            OrderItemStatus.alias == alias,
        )
    )

    if order_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Estado '{alias}' não configurado",
        )

    return order_status


def load_menu_items(
    db: Session,
    item_ids: set[int],
) -> dict[int, MenuItem]:
    menu_items = {
        menu_item.id: menu_item
        for menu_item in db.scalars(
            select(MenuItem).where(
                MenuItem.id.in_(item_ids)
            )
        ).all()
    }

    missing_ids = item_ids - set(menu_items)

    if missing_ids:
        missing = ", ".join(
            str(item_id)
            for item_id in sorted(missing_ids)
        )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artigos não encontrados: {missing}",
        )

    return menu_items


def load_buffet_item_ids(
    db: Session,
    buffet_id: int,
    item_ids: set[int],
) -> set[int]:
    return set(
        db.scalars(
            select(BuffetItem.menu_item_id).where(
                BuffetItem.buffet_id == buffet_id,
                BuffetItem.menu_item_id.in_(item_ids),
            )
        ).all()
    )


@router.post(
    "/tables/{table_code}/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    order_data: OrderCreate,
    guest: CurrentGuest,
    db: DbSession,
) -> Order:
    client_request_id = str(
        order_data.client_request_id
    )

    # Primeira verificação de idempotência.
    existing_order = find_order_by_request_id(
        db=db,
        guest_id=guest.id,
        client_request_id=client_request_id,
    )

    if existing_order is not None:
        return existing_order

    # Bloqueia o guest durante a criação para impedir
    # que duas rondas concorrentes recebam o mesmo número.
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

    # Nova verificação depois de adquirir o bloqueio.
    existing_order = find_order_by_request_id(
        db=db,
        guest_id=locked_guest.id,
        client_request_id=client_request_id,
    )

    if existing_order is not None:
        return existing_order

    pending_status = require_order_status(
        db,
        "pending",
    )

    requested_item_ids = {
        requested_item.item_id
        for requested_item in order_data.items
    }

    menu_items = load_menu_items(
        db,
        requested_item_ids,
    )

    buffet_item_ids: set[int] | None = None

    if locked_guest.buffet_id is not None:
        buffet_item_ids = load_buffet_item_ids(
            db=db,
            buffet_id=locked_guest.buffet_id,
            item_ids=requested_item_ids,
        )

    for menu_item in menu_items.values():
        if not menu_item.is_available:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    f"Artigo '{menu_item.name}' "
                    "indisponível"
                ),
            )

    current_round = db.scalar(
        select(func.max(Order.round_number)).where(
            Order.guest_id == locked_guest.id,
        )
    ) or 0

    order = Order(
        guest_id=locked_guest.id,
        round_number=current_round + 1,
        client_request_id=client_request_id,
    )

    for requested_item in order_data.items:
        menu_item = menu_items[
            requested_item.item_id
        ]

        order.items.append(
            OrderItem(
                item_id=menu_item.id,
                status_id=pending_status.id,
                quantity=requested_item.quantity,
                notes=requested_item.notes,
                unit_price=menu_item.base_price,
                unit_price_at_order=(
                    menu_item.base_price
                ),
            )
        )

    db.add(order)

    try:
        db.flush()
        order_id = order.id
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        # Outra operação pode ter criado o pedido
        # com o mesmo client_request_id.
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

    # Atualiza o quadro da cozinha.
    broadcast_active_tickets(db)
    broadcast_staff_dashboard(db, session_id=locked_guest.session_id)

    # Notifica o frontend do guest.
    publish_guest_event(
        locked_guest.id,
        "orders.changed",
    )

    return require_order_by_id(
        db=db,
        order_id=order_id,
        guest_id=locked_guest.id,
    )


@router.get(
    "/tables/{table_code}/orders",
    response_model=list[OrderResponse],
)
def get_orders(
    guest: CurrentGuest,
    db: DbSession,
) -> list[Order]:
    return list(
        db.scalars(
            select(Order)
            .options(*ORDER_LOAD_OPTIONS)
            .where(
                Order.guest_id == guest.id
            )
            .order_by(
                Order.created_at.desc(),
                Order.id.desc(),
            )
        ).all()
    )


@router.get(
    "/tables/{table_code}/orders/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: int,
    guest: CurrentGuest,
    db: DbSession,
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
    order_id: int,
    item_id: int,
    guest: CurrentGuest,
    db: DbSession,
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
            detail="Artigo do pedido não encontrado",
        )

    if order_item.status.alias != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Apenas artigos pendentes "
                "podem ser cancelados"
            ),
        )

    cancelled_status = require_order_status(
        db,
        "cancelled",
    )

    order_item.status_id = cancelled_status.id

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Não foi possível cancelar "
                "o artigo do pedido"
            ),
        ) from exc

    refreshed_item = db.scalar(
        select(OrderItem)
        .options(
            selectinload(OrderItem.menu_item),
            selectinload(OrderItem.status),
        )
        .where(
            OrderItem.id == order_item.id
        )
    )

    if refreshed_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artigo do pedido não encontrado",
        )

    # Retira imediatamente o artigo cancelado
    # do quadro da cozinha.
    broadcast_active_tickets(db)
    broadcast_staff_dashboard(db, session_id=guest.session_id)

    # Atualiza o frontend do guest.
    publish_guest_event(
        guest.id,
        "orders.changed",
    )

    return refreshed_item