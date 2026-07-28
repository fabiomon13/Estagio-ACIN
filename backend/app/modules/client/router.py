#backend/app/modules/client/router.py

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db

from app.models.buffet import Buffet
from app.models.buffet_item import BuffetItem
from app.models.category import Category
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.payment import Payment
from app.models.restaurant_table import RestaurantTable
from app.models.service_request import ServiceRequest
from app.models.service_request_status import ServiceRequestStatus
from app.models.service_request_type import ServiceRequestType

from app.modules.client.security import hash_device_token
from app.modules.client.schemas import (
    BillResponse,
    BuffetResponse,
    CategoryResponse,
    GuestCreate,
    GuestResponse,
    MenuItemResponse,
    OrderCreate,
    OrderResponse,
    ServiceRequestCreate,
    ServiceRequestResponse,
    SessionCreate,
    SessionResponse,
    TableResponse,
)


router = APIRouter()


def find_table(
    table_code: str,
    db: Session,
) -> RestaurantTable:
    table = db.scalar(
        select(RestaurantTable).where(
            RestaurantTable.public_code == table_code,
        )
    )

    if table is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesa não encontrada",
        )

    return table


def find_active_session(
    table_id: int,
    db: Session,
) -> DiningSession:
    dining_session = db.scalar(
        select(DiningSession).where(
            DiningSession.table_id == table_id,
            DiningSession.is_active.is_(True),
        )
    )

    if dining_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="A mesa não possui uma sessão ativa",
        )

    return dining_session


def find_current_guest(
    table_code: str,
    device_token: str,
    db: Session,
) -> Guest:
    table = find_table(table_code, db)
    dining_session = find_active_session(table.id, db)
    token_hash = hash_device_token(device_token)

    guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        )
    )

    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado nesta sessão",
        )

    return guest


@router.get(
    "/tables/{table_code}",
    response_model=TableResponse,
)
def get_table(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> RestaurantTable:
    return find_table(table_code, db)


@router.get(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
)
def get_active_session(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    table = find_table(table_code, db)

    return find_active_session(table.id, db)


@router.post(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    table_code: str,
    session_data: SessionCreate,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    table = find_table(table_code, db)

    if session_data.num_clients > table.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O número de clientes ultrapassa a capacidade da mesa",
        )

    existing_session = db.scalar(
        select(DiningSession).where(
            DiningSession.table_id == table.id,
            DiningSession.is_active.is_(True),
        )
    )

    if existing_session is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A mesa já possui uma sessão ativa",
        )

    dining_session = DiningSession(
        table_id=table.id,
        num_clients=session_data.num_clients,
        is_active=True,
        is_approved=False,
    )

    db.add(dining_session)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A mesa já possui uma sessão ativa",
        ) from exc

    db.refresh(dining_session)

    return dining_session


@router.post(
    "/tables/{table_code}/guests",
    response_model=GuestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest(
    table_code: str,
    guest_data: GuestCreate,
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    table = find_table(table_code, db)
    dining_session = find_active_session(table.id, db)

    if not dining_session.is_approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sessão ainda não foi aprovada",
        )

    buffet = (
        db.get(Buffet, guest_data.buffet_id)
        if guest_data.buffet_id is not None
        else None
    )

    if guest_data.buffet_id is not None and buffet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet não encontrado",
        )

    token_hash = hash_device_token(guest_data.device_token)

    existing_guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        )
    )

    if existing_guest is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este dispositivo já pertence à sessão",
        )

    guest = Guest(
        session_id=dining_session.id,
        buffet_id=buffet.id if buffet is not None else None,
        device_token_hash=token_hash,
    )

    db.add(guest)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível adicionar o cliente à sessão",
        ) from exc

    db.refresh(guest)

    return guest


@router.get(
    "/tables/{table_code}/guests/me",
    response_model=GuestResponse,
)
def get_current_guest(
    table_code: str,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    return find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )


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
            .join(
                BuffetItem,
                BuffetItem.menu_item_id == MenuItem.id,
            )
            .where(BuffetItem.buffet_id == buffet_id)
            .order_by(MenuItem.name)
        ).all()
    )


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
)
def get_categories(
    db: Annotated[Session, Depends(get_db)],
) -> list[Category]:
    return list(
        db.scalars(
            select(Category).order_by(Category.name)
        ).all()
    )


@router.post(
    "/tables/{table_code}/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    table_code: str,
    order_data: OrderCreate,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    pending_status = db.scalar(
        select(OrderItemStatus).where(
            OrderItemStatus.name == "Pending",
        )
    )

    if pending_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Estado Pending não configurado",
        )

    current_round = db.scalar(
        select(func.max(Order.round_number)).where(
            Order.guest_id == guest.id,
        )
    ) or 0

    order = Order(
        guest_id=guest.id,
        round_number=current_round + 1,
    )

    db.add(order)
    db.flush()

    try:
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

            if guest.buffet_id is not None:
                buffet_item = db.get(
                    BuffetItem,
                    (menu_item.id, guest.buffet_id),
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

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível criar o pedido",
        ) from exc

    created_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )

    if created_order is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível carregar o pedido criado",
        )

    return created_order


@router.get(
    "/tables/{table_code}/orders",
    response_model=list[OrderResponse],
)
def get_orders(
    table_code: str,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> list[Order]:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    return list(
        db.scalars(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.guest_id == guest.id)
            .order_by(Order.created_at.desc())
        ).all()
    )


@router.get(
    "/tables/{table_code}/orders/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    table_code: str,
    order_id: int,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.id == order_id,
            Order.guest_id == guest.id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado",
        )

    return order


@router.post(
    "/tables/{table_code}/service-requests",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_service_request(
    table_code: str,
    request_data: ServiceRequestCreate,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> ServiceRequest:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    pending_status = db.scalar(
        select(ServiceRequestStatus).where(
            ServiceRequestStatus.alias == "pending",
        )
    )

    if pending_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Estado Pending de assistência não configurado",
        )

    request_type = db.scalar(
        select(ServiceRequestType).where(
            ServiceRequestType.alias == request_data.type,
        )
    )

    if request_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tipo de pedido de assistência inválido",
        )

    service_request = ServiceRequest(
        session_id=guest.session_id,
        status_id=pending_status.id,
        type_id=request_type.id,
    )

    db.add(service_request)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível criar o pedido de assistência",
        ) from exc

    db.refresh(service_request)

    return service_request


@router.get(
    "/tables/{table_code}/service-requests",
    response_model=list[ServiceRequestResponse],
)
def get_service_requests(
    table_code: str,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> list[ServiceRequest]:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    return list(
        db.scalars(
            select(ServiceRequest)
            .where(
                ServiceRequest.session_id == guest.session_id,
            )
            .order_by(ServiceRequest.created_at.desc())
        ).all()
    )


@router.get(
    "/tables/{table_code}/bill",
    response_model=BillResponse,
)
def get_bill(
    table_code: str,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> BillResponse:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    session_guests = list(
        db.scalars(
            select(Guest)
            .options(selectinload(Guest.buffet))
            .where(
                Guest.session_id == guest.session_id,
            )
        ).all()
    )

    buffet_total = sum(
        (
            session_guest.buffet.price
            for session_guest in session_guests
            if session_guest.buffet is not None
        ),
        start=Decimal("0.00"),
    )

    extras_value = db.scalar(
        select(
            func.coalesce(
                func.sum(
                    OrderItem.quantity
                    * OrderItem.unit_price_at_order
                ),
                0,
            )
        )
        .join(
            Order,
            Order.id == OrderItem.order_id,
        )
        .join(
            Guest,
            Guest.id == Order.guest_id,
        )
        .where(
            Guest.session_id == guest.session_id,
            Guest.buffet_id.is_(None),
        )
    )

    extras_total = Decimal(extras_value or 0)

    payment = db.scalar(
        select(Payment).where(
            Payment.session_id == guest.session_id,
        )
    )

    return BillResponse(
        session_id=guest.session_id,
        buffet_total=buffet_total,
        extras_total=extras_total,
        total=buffet_total + extras_total,
        is_paid=payment is not None,
    )
