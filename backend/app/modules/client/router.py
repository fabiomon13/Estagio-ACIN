#backend/app/modules/client/router.py

from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
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
from app.models.tag import Tag
from app.models.tag_item import TagItem

from app.modules.client.security import hash_device_token
from app.modules.client.schemas import (
    BillResponse,
    BuffetResponse,
    CategoryResponse,
    GuestCreate,
    GuestBuffetUpdate,
    GuestResponse,
    MenuItemResponse,
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    ServiceRequestCreate,
    ServiceRequestResponse,
    SessionCreate,
    SessionResponse,
    TableResponse,
    ServiceRequestTypeResponse,
)


router = APIRouter()

DeviceTokenHeader = Annotated[
    str,
    Header(
        alias="X-Device-Token",
        min_length=32,
        max_length=128,
    ),
]

MENU_ITEM_LOAD_OPTIONS = (
    selectinload(MenuItem.category),
    selectinload(MenuItem.tag_links).selectinload(TagItem.tag),
)

ORDER_LOAD_OPTIONS = (
    selectinload(Order.items).selectinload(OrderItem.menu_item),
    selectinload(Order.items).selectinload(OrderItem.status),
)

# Find table by code
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
            detail="Table not found",
        )

    return table

# Find active session for a table
def find_active_session(
    table_id: int,
    db: Session,
    *,
    lock: bool = False,
) -> DiningSession:
    query = (
        select(DiningSession)
        .options(selectinload(DiningSession.guests))
        .where(
            DiningSession.table_id == table_id,
            DiningSession.is_active.is_(True),
        )
    )

    if lock:
        query = query.with_for_update()

    dining_session = db.scalar(query)

    if dining_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table does not have an active session",
        )

    return dining_session

# Find current guest based on table code and device token
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
            detail="Guest not found in this session",
        )

    return guest


# Get table endpoint
@router.get(
    "/tables/{table_code}",
    response_model=TableResponse,
    tags=["Client - Mesas e Sessões"],
)
def get_table(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> RestaurantTable:
    # Find the table based on the provided table code and return it. If the table is not found, raise a 404 HTTP exception.
    return find_table(table_code, db)


# Get active session endpoint
@router.get(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
    tags=["Client - Mesas e Sessões"],
)
def get_active_session(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    # Find the table based on the provided table code and then find the active session for that table.
    table = find_table(table_code, db)

    # Return the active session for the table.
    return find_active_session(table.id, db)

# Create session endpoint
@router.post(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Client - Mesas e Sessões"],
)
def create_session(
    table_code: str,
    session_data: SessionCreate,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    # Find the table based on the provided table code
    table = find_table(table_code, db)

    # Check if the number of clients exceeds the table's maximum capacity. If it does, raise a 422 HTTP exception.
    if session_data.num_clients > table.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The number of clients exceeds the table's capacity",
        )

    existing_session = db.scalar(
        select(DiningSession).where(
            DiningSession.table_id == table.id,
            DiningSession.is_active.is_(True),
        )
    )

    # If there is an existing active session, raise a 409 HTTP exception indicating that the table already has an active session.
    if existing_session is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Table already has an active session",
        )

    # Create a new dining session with the provided number of clients and set it as active but not approved.
    dining_session = DiningSession(
        table_id=table.id,
        num_clients=session_data.num_clients,
        is_active=True,
        is_approved=False,
    )

    # Add the new dining session to the database session and attempt to commit the changes.
    db.add(dining_session)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Table already has an active session",
        ) from exc

    db.refresh(dining_session)

    return dining_session

# Create guest endpoint
@router.post(
    "/tables/{table_code}/guests",
    response_model=GuestResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Client - Clientes"],
)
def create_guest(
    table_code: str,
    guest_data: GuestCreate,
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    # Find the table based on the provided table code
    table = find_table(table_code, db)

    # Find the active dining session for the table and lock it for update to prevent concurrent modifications
    dining_session = find_active_session(
        table.id,
        db,
        lock=True,
    )

    # Check if the dining session has been approved.
    if not dining_session.is_approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Table session has not been approved",
        )

    buffet = (
        db.get(Buffet, guest_data.buffet_id)
        if guest_data.buffet_id is not None
        else None
    ) 

    # Check if the buffet ID provided in the guest data exists in the database
    if guest_data.buffet_id is not None and buffet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet not found",
        )

    # Hash the device token provided in the guest data to create a unique identifier for the guest's device
    token_hash = hash_device_token(guest_data.device_token)

    existing_guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        )
    )

    # Check if a guest with the same device token hash already exists in the current dining session
    if existing_guest is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This device is already part of the session",
        )

    guest_count = db.scalar(
        select(func.count(Guest.id)).where(
            Guest.session_id == dining_session.id,
        )
    ) or 0

    # Check if the number of guests in the session has reached the maximum number of clients allowed for the dining session
    if guest_count >= dining_session.num_clients:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session has already reached the maximum number of clients",
        )

    # Create a new guest with the provided device token hash, buffet ID (if any), and associate it with the current dining session
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

# Get current guest endpoint
@router.get(
    "/tables/{table_code}/guests/me",
    response_model=GuestResponse,
    tags=["Client - Clientes"],
)
def get_current_guest(
    table_code: str,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    # Find the current guest based on the provided table code and device token.
    return find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

# Update current guest buffet endpoint
@router.patch(
    "/tables/{table_code}/guests/me/buffet",
    response_model=GuestResponse,
    tags=["Client - Clientes"],
)
def update_current_guest_buffet(
    table_code: str,
    guest_data: GuestBuffetUpdate,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    # Find the current guest based on the provided table code and device token.
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    # Check if the guest has any existing orders.
    has_orders = db.scalar(
        select(Order.id)
        .where(Order.guest_id == guest.id)
        .limit(1)
    )
    if has_orders is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Its not possible to alter the buffet after the first order",
        )

    # Check if the buffet ID provided in the guest data exists in the database. If it does, retrieve the buffet; otherwise, set it to None.
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

    # Update the guest's buffet ID to the new buffet ID (if any) and commit the changes to the database.
    guest.buffet_id = buffet.id if buffet is not None else None
    db.commit()
    db.refresh(guest)

    return guest

# Get buffets endpoint
@router.get(
    "/buffets",
    response_model=list[BuffetResponse],
    tags=["Client - Menu"],
)
def get_buffets(
    db: Annotated[Session, Depends(get_db)],
) -> list[Buffet]:
    # Fetch all buffets from the database, ordered by name, and return them as a list.
    return list(
        db.scalars(
            select(Buffet).order_by(Buffet.name)
        ).all()
    )


@router.get(
    "/buffets/{buffet_id}/items",
    response_model=list[MenuItemResponse],
    tags=["Client - Menu"],
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
            .where(BuffetItem.buffet_id == buffet_id)
            .order_by(MenuItem.name)
        ).all()
    )


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
    tags=["Client - Menu"],
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
    tags=["Client - Pedidos"],
)
def create_order(
    table_code: str,
    order_data: OrderCreate,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    client_request_id = str(order_data.client_request_id)
    existing_order = db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(
            Order.guest_id == guest.id,
            Order.client_request_id == client_request_id,
        )
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
    guest = locked_guest

    pending_status = db.scalar(
        select(OrderItemStatus).where(
            OrderItemStatus.alias == "pending",
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
        client_request_id=client_request_id,
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

            if not menu_item.is_available:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Artigo {menu_item.name} indisponível",
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
        .options(*ORDER_LOAD_OPTIONS)
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
    tags=["Client - Pedidos"],
)
def get_orders(
    table_code: str,
    device_token: DeviceTokenHeader,
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
            .options(*ORDER_LOAD_OPTIONS)
            .where(Order.guest_id == guest.id)
            .order_by(Order.created_at.desc())
        ).all()
    )


@router.get(
    "/tables/{table_code}/orders/{order_id}",
    response_model=OrderResponse,
    tags=["Client - Pedidos"],
)
def get_order(
    table_code: str,
    order_id: int,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    order = db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
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

# Create service request endpoint
@router.post(
    "/tables/{table_code}/service-requests",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Client - Assistência"],
)
def create_service_request(
    table_code: str,
    request_data: ServiceRequestCreate,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> ServiceRequest:

    # Find the current guest based on the table code and device token
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    # Find the "pending" status for service requests
    pending_status = db.scalar(
        select(ServiceRequestStatus).where(
            ServiceRequestStatus.alias == "pending",
        )
    )

    # Check if the "pending" status exists; if not, raise an HTTP exception
    if pending_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Estado Pending de assistência não configurado",
        )

    # Find the service request type based on the provided alias in the request data
    request_type = db.scalar(
        select(ServiceRequestType).where(
            ServiceRequestType.alias == request_data.type,
        )
    )

    # Check if the service request type exists; if not, raise an HTTP exception
    if request_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tipo de pedido de assistência inválido",
        )

    # Check if there is an existing unresolved service request of the same type for the current guest's session
    existing_request = db.scalar(
        select(ServiceRequest).where(
            ServiceRequest.session_id == guest.session_id,
            ServiceRequest.type_id == request_type.id,
            ServiceRequest.resolved_at.is_(None),
        )
    )
    if existing_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um pedido deste tipo em aberto",
        )

    # Create a new service request with the current guest's session ID, the "pending" status ID, and the service request type ID
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

    # Refresh the service request instance to get the latest data from the database
    created_request = db.scalar(
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.request_type),
            selectinload(ServiceRequest.status),
        )
        .where(ServiceRequest.id == service_request.id)
    )

    # Check if the created service request was successfully retrieved; if not, raise an HTTP exception
    if created_request is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível carregar o pedido de assistência",
        )

    return created_request

# Get service requests for a specific table endpoint
@router.get(
    "/tables/{table_code}/service-requests",
    response_model=list[ServiceRequestResponse],
    tags=["Client - Assistência"],
)
def get_service_requests(
    table_code: str,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> list[ServiceRequest]:
    # Find the current guest based on the table code and device token
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    # Retrieve all service requests for the guest's session, including their request type and status, ordered by creation date in descending order
    return list(
        db.scalars(
            select(ServiceRequest)
            .options(
                selectinload(ServiceRequest.request_type),
                selectinload(ServiceRequest.status),
            )
            .where(
                ServiceRequest.session_id == guest.session_id,
            )
            .order_by(ServiceRequest.created_at.desc())
        ).all()
    )

# Get bill endpoint
@router.get(
    "/tables/{table_code}/bill",
    response_model=BillResponse,
    tags=["Client - Conta"],
)
def get_bill(
    table_code: str,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> BillResponse:
    # Find the current guest based on the table code and device token
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    # Retrieve all guests in the same session, including their buffet information
    session_guests = list(
        db.scalars(
            select(Guest)
            .options(selectinload(Guest.buffet))
            .where(
                Guest.session_id == guest.session_id,
            )
        ).all()
    )

    # Calculate the total buffet cost by summing the prices of all guests' buffets, if they have one
    buffet_total = sum(
        (
            session_guest.buffet.price
            for session_guest in session_guests
            if session_guest.buffet is not None
        ),
        start=Decimal("0.00"),
    )

    # Calculate the total cost of extras (non-buffet items) for the session, excluding cancelled or returned items
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
        .join(
            OrderItemStatus,
            OrderItemStatus.id == OrderItem.status_id,
        )
        .where(
            Guest.session_id == guest.session_id,
            Guest.buffet_id.is_(None),
            OrderItemStatus.alias.in_(("cancelled", "returned")),
        )
    )

    extras_total = Decimal(extras_value or 0)

    # Retrieve the payment information for the session, if it exists
    payment = db.scalar(
        select(Payment).where(
            Payment.session_id == guest.session_id,
        )
    )

    # Calculate the waste unit charge based on the maximum waste charge among all guests' buffets, if they have one
    waste_unit_charge = max(
        (
            Decimal(session_guest.buffet.waste_charge)
            for session_guest in session_guests
            if session_guest.buffet is not None
        ),
        default=Decimal("0.00"),
    )
    waste_count = payment.waste_count if payment is not None else 0
    waste_total = Decimal(waste_count) * waste_unit_charge

    # Calculate the tip amount based on the payment information, if it exists
    tip_amount = (
        Decimal(payment.tip_amount)
        if payment is not None
        else Decimal("0.00")
    )

    # Return the bill response with all calculated totals and payment information
    return BillResponse(
        session_id=guest.session_id,
        buffet_total=buffet_total,
        extras_total=extras_total,
        waste_total=waste_total,
        tip_amount=tip_amount,
        total=buffet_total + extras_total + waste_total + tip_amount,
        is_paid=payment is not None,
        paid_at=payment.paid_at if payment is not None else None,
    )

# Get service request types endpoint
@router.get(
    "/service-request-types",
    response_model=list[ServiceRequestTypeResponse],
    tags=["Client - Assistência"],
)
def get_service_request_types(
    db: Annotated[Session, Depends(get_db)],
) -> list[ServiceRequestType]:
    # Fetch all service request types from the database, ordered by name, and return them as a list.
    return list(
        db.scalars(
            select(ServiceRequestType).order_by(ServiceRequestType.name)
        ).all()
    )

# Get menu items endpoint
@router.get(
    "/menu-items",
    response_model=list[MenuItemResponse],
    tags=["Client - Menu"],
)
def get_menu_items(
    db: Annotated[Session, Depends(get_db)],
    category_id: int | None = Query(default=None, gt=0),
    is_available: bool | None = None,
    tag: str | None = Query(default=None, min_length=1, max_length=100),
    buffet_id: int | None = Query(default=None, gt=0),
) -> list[MenuItem]:
    query = select(MenuItem).options(*MENU_ITEM_LOAD_OPTIONS)

    # Filter by category
    if category_id is not None:
        category = db.get(Category, category_id)

        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada",
            )

        query = query.where(
            MenuItem.category_id == category_id
        )

    # Filter by availability
    if is_available is not None:
        query = query.where(
            MenuItem.is_available.is_(is_available)
        )

    # Filter by tag
    if tag is not None:
        existing_tag = db.scalar(
            select(Tag).where(Tag.alias == tag)
        )
        if existing_tag is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag não encontrada",
            )

        query = (
            query
            .join(TagItem, TagItem.menu_item_id == MenuItem.id)
            .where(TagItem.tag_id == existing_tag.id)
        )

    # Filter by buffet
    if buffet_id is not None:
        buffet = db.get(Buffet, buffet_id)
        if buffet is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buffet não encontrado",
            )

        query = (
            query
            .join(BuffetItem, BuffetItem.menu_item_id == MenuItem.id)
            .where(BuffetItem.buffet_id == buffet.id)
        )

    # Remove duplicates and order by name
    query = query.distinct().order_by(MenuItem.name)

    # Execute the query and return the results
    return list(
        db.scalars(query).all()
    )

# Cancel order item endpoint
@router.patch(
    "/tables/{table_code}/orders/{order_id}/items/{item_id}/cancel",
    response_model=OrderItemResponse,
    tags=["Client - Pedidos"],
)
def cancel_order_item(
    table_code: str,
    order_id: int,
    item_id: int,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> OrderItem:
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    # Lock the order item
    order_item = db.scalar(
        select(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
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

    # Check if the order item exists
    if order_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order item not found.",
        )

    # Check if the order item is in a cancellable state
    if order_item.status.alias != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not allowed to cancel an order item that is not in a pending state.",
        )

    # Find the cancelled status
    canceled_status = db.scalar(
        select(OrderItemStatus).where(
            OrderItemStatus.alias == "cancelled",
        )
    )

    # Check if the cancelled status exists
    if canceled_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cancelled status not configured.",
        )


    order_item.status_id = canceled_status.id
    db.commit()
    db.refresh(order_item)

    return order_item

# Cancel service request endpoint
@router.delete(
    "/tables/{table_code}/service-requests/{request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Client - Assistência"],
)
def cancel_service_request(
    table_code: str,
    request_id: int,
    device_token: DeviceTokenHeader,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    # Find the current guest based on the table code and device token
    guest = find_current_guest(
        table_code=table_code,
        device_token=device_token,
        db=db,
    )

    # Lock the service request
    service_request = db.scalar(
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.request_type),
            selectinload(ServiceRequest.status),
        )
        .where(
            ServiceRequest.id == request_id,
            ServiceRequest.session_id == guest.session_id,
        )
        .with_for_update()
    )

    # Check if the service request exists
    if service_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    # Check if the service request is in a cancellable state
    if service_request.status.alias != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not allowed to cancel a service request that is not in a pending state.",
        )

    # Find the cancelled status
    canceled_status = db.scalar(
        select(ServiceRequestStatus).where(
            ServiceRequestStatus.alias == "cancelled",
        )
    )

    # Check if the cancelled status exists
    if canceled_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cancelled status not configured.",
        )

    # Update the service request status to cancelled and set the resolved_at timestamp
    service_request.status_id = canceled_status.id
    service_request.resolved_at = datetime.now(timezone.utc)

    db.commit()