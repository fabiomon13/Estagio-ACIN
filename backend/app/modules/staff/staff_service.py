from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload   
from datetime import datetime, timedelta, timezone

from app.models.payment import Payment
from app.modules.client.services.billing import (
    ZERO_MONEY,
    calculate_guest_extras_total,
    calculate_waste_total,
)
from app.modules.kitchen.service import broadcast_active_tickets

from app.models.dining_session import DiningSession
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.service_request import ServiceRequest
from app.modules.staff.staff_contract import (
    StaffDashboard,
    StaffDashboardSummary,
    StaffDashboardTable,
    StaffOpenRequest,
    StaffTableState,
    StaffReadyTable,
    StaffReadyItem,
    StaffPreparingItem,
    StaffPreparingTable,
    StaffPaymentCreate,
    StaffPaymentResponse,
    StaffSessionBillGuest,
    StaffSessionBillResponse,
)
from app.models.service_request_type import ServiceRequestType
from app.models.service_request_status import ServiceRequestStatus
from app.models.staff import Staff
from app.models.staff_role import StaffRole
from app.core.roles import StaffRoleEnum, staff_role
import random

from app.modules.staff.websockets.staff_realtime import broadcast_staff_dashboard

from app.models.restaurant_table import RestaurantTable
from app.modules.client.realtime import (
    publish_guest_event,
    publish_menu_event,
    publish_session_event,
)

from decimal import Decimal

from app.models.payment import Payment
from app.modules.client.services.billing import (
    ZERO_MONEY,
    calculate_extras_total,
    calculate_waste_total,
)


READY_ORDER_ITEM_ALIAS = "ready"
SERVED_ORDER_ITEM_ALIAS = "served"

PAYMENT_REQUEST_TYPE = "payment_request"
ASSISTANCE_REQUEST_TYPE = "assistance"

PENDING_SERVICE_REQUEST_ALIAS = "pending"
PREPARING_ORDER_ITEM_ALIAS = "preparing"
CANCELLED_ORDER_ITEM_ALIAS = "cancelled"
RESOLVED_SERVICE_REQUEST_ALIAS = "resolved"

def get_order_item_status_by_alias(db: Session, alias: str) -> OrderItemStatus:
    """
    Fetches an OrderItemStatus by its alias[cite: 1].
    Raises an HTTP 500 error if the status alias is not found in the database[cite: 1].
    """
    status_row = db.query(OrderItemStatus)\
    .filter(func.lower(OrderItemStatus.alias) == alias.lower())\
    .first()
   
    if status_row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order item status with alias '{alias}' not found."
        )

    return status_row

def get_service_request_type_by_alias(db: Session, alias: str) -> ServiceRequestType:
    """
    Fetches a ServiceRequestType by its alias[cite: 1].
    Raises an HTTP 500 error if the service request type is not configured in the database[cite: 1].
    """
    row = db.query(ServiceRequestType).filter(func.lower(ServiceRequestType.alias) == alias.lower()).first()
    if row is None:
        raise HTTPException(status_code=500, detail=f"Service request type '{alias}' is not configured")
    return row

def get_service_request_status_by_alias(db: Session, alias: str) -> ServiceRequestStatus:
    """
    Fetches a ServiceRequestStatus by its alias[cite: 1].
    Raises an HTTP 500 error if the service request status is not configured in the database[cite: 1].
    """
    row = db.query(ServiceRequestStatus).filter(func.lower(ServiceRequestStatus.alias) == alias.lower()).first()
    if row is None:
        raise HTTPException(status_code=500, detail=f"Service request status '{alias}' is not configured")
    return row

def get_staff_dashboard(db: Session) -> StaffDashboard:
    """
    Fetches and formats all data for the staff dashboard[cite: 1].
    Calculates occupied tables, guest counts, and table totals for active sessions[cite: 1].
    Also compiles lists of ready-to-serve items and open service requests for the dashboard response[cite: 1].
    """

    ready_status = get_order_item_status_by_alias(db, READY_ORDER_ITEM_ALIAS)
    preparing_status = get_order_item_status_by_alias(db,PREPARING_ORDER_ITEM_ALIAS)

    active_sessions = (
        db.query(DiningSession)
        .options(joinedload(DiningSession.restaurant_table))
        .filter(DiningSession.is_active == True)
        .all()
    )

    occupied_tables = len(active_sessions)
    guest_count = sum(session.num_clients for session in active_sessions)

    tables_data = []
    ready_to_serve_table = []
    preparing_orders = []

    # NEW: load all restaurant tables and map current active session by table_id
    all_tables = db.query(RestaurantTable).order_by(RestaurantTable.table_number).all()
    active_session_by_table = {s.table_id: s for s in active_sessions}

    for table in all_tables:
        session = active_session_by_table.get(table.id)

        # No active session => keep table visible as inactive
        if session is None:
            tables_data.append(
                StaffDashboardTable(
                    session_id=None,
                    table_number=table.table_number,
                    guest_count=0,
                    state=StaffTableState.INACTIVE,
                    started_at=None,
                    ready_item_count=0,
                    total="$0.00",
                    waiter_name=None,
                    waiter_id=None  
                )
            )
            continue

        state = StaffTableState.ACTIVE if session.is_approved else StaffTableState.AWAITING_APPROVAL

        session_guests = (
            db.query(Guest)
            .options(joinedload(Guest.buffet))
            .filter(Guest.session_id == session.id)
            .all()
        )

        buffet_total = sum(
            (
                Decimal(guest.buffet.price)
                for guest in session_guests
                if guest.buffet is not None
            ),
            ZERO_MONEY,
        )

        extras_total = calculate_extras_total(
            db=db,
            session_id=session.id,
        )

        payment = (
            db.query(Payment)
            .filter(Payment.session_id == session.id)
            .first()
        )

        waste_total = calculate_waste_total(
            session_guests=session_guests,
            payment=payment,
        )

        tip_amount = (
            Decimal(payment.tip_amount)
            if payment is not None
            else ZERO_MONEY
        )

        total_amount = (
            buffet_total
            + extras_total
            + waste_total
            + tip_amount
        )

        ready_items = (
            db.query(OrderItem)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Guest, Guest.id == Order.guest_id)
            .filter(Guest.session_id == session.id, OrderItem.status_id == ready_status.id)
            .all()
        )

        preparing_items = (
            db.query(OrderItem)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Guest, Guest.id == Order.guest_id)
            .filter(
                Guest.session_id == session.id,
                OrderItem.status_id == preparing_status.id,
            )
            .all()
        )

        tables_data.append(
            StaffDashboardTable(
                session_id=session.id,
                table_number=table.table_number,
                guest_count=session.num_clients,
                state=state,
                started_at=session.start_time,
                ready_item_count=len(ready_items),
                total=f"${total_amount:.2f}",
                waiter_name=session.waiter.name if session.waiter else None,
                waiter_id=session.waiter.id if session.waiter else None
            )
        )

        if ready_items:
            items_payload = [
                StaffReadyItem(
                    id=item.id,
                    name=item.menu_item.name if item.menu_item else "Unknown Item",
                    quantity=item.quantity,
                )
                for item in ready_items
            ]
            ready_to_serve_table.append(
                StaffReadyTable(
                    table_number=table.table_number,
                    items=items_payload,
                )
            )

        if preparing_items:
            preparing_orders.append(
                StaffPreparingTable(
                    table_number=table.table_number,
                    waiter_id=session.waiter_id,
                    items=[
                        StaffPreparingItem(
                            id=item.id,
                            name=item.menu_item.name if item.menu_item else "Unknown item",
                            quantity=item.quantity,
                            status="preparing",
                            preparation_started_at=item.updated_at,
                            estimated_ready_at=item.updated_at
                            + timedelta(
                                minutes=item.menu_item.base_preparation_time
                                if item.menu_item
                                else 0
                            ),
                        )
                        for item in preparing_items
                    ],
                )
            )

    # Open service requests
    open_requests = db.query(ServiceRequest, ServiceRequestType)\
    .join(DiningSession, DiningSession.id == ServiceRequest.session_id)\
    .join(ServiceRequestType, ServiceRequestType.id == ServiceRequest.type_id)\
    .options(joinedload(ServiceRequest.dining_session).joinedload(DiningSession.restaurant_table))\
    .filter(DiningSession.is_active == True, ServiceRequest.resolved_at.is_(None)).all()

    requests_data = [
        StaffOpenRequest(
            id=request.id,
            table_number=request.dining_session.restaurant_table.table_number if request.dining_session and request.dining_session.restaurant_table else 0,
            type=request_type.alias,
            is_high_priority=request_type.is_high_priority,
            created_at=request.created_at
        )
        for request, request_type in open_requests
    ]

    summary = StaffDashboardSummary(
        occupied_tables=occupied_tables,
        guest_count=guest_count,
        open_requests=len(requests_data)
    )

    return StaffDashboard(
        summary=summary,
        tables=tables_data,
        ready_to_serve=ready_to_serve_table,
        requests=requests_data,
        preparing_orders=preparing_orders,
    )

def approve_session(db: Session, session_id: int, approved_by_staff_id: int) -> dict:
    """
    Approves a dining session by setting its is_approved attribute to True[cite: 1].
    Raises an HTTP 404 error if the session is not found, or an HTTP 400 error if it is already approved[cite: 1].
    """
    session = db.query(DiningSession).filter(DiningSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Dining session not found")

    if session.is_approved:
        raise HTTPException(status_code=400, detail="Dining session is already approved")

    chosen_waiter, current_load = associate_staff_to_tables(db)

    session.is_approved = True
    session.approved_at = datetime.now(timezone.utc)
    session.waiter_id = chosen_waiter.id

    db.commit()
    db.refresh(session)

    broadcast_staff_dashboard(db)

    publish_session_event(session.id, "session.changed")

    return {
        "message": "Dining session approved successfully",
        "session_id": session_id,
        "is_approved": session.is_approved,
        "approved_by_staff_id": approved_by_staff_id,
        "waiter_id": chosen_waiter.id,
        "waiter_name": chosen_waiter.name,
        "waiter_active_tables_after_assignment": current_load + 1,
            }

def mark_item_as_served(db: Session, item_id: int, current_staff) -> dict:
    """
    Updates a specific order item's status to 'served'[cite: 1].
    Raises an HTTP 404 error if the order item is not found, or an HTTP 400 error if the item is not currently in a 'ready' state[cite: 1].
    """
    order_item = db.query(OrderItem).filter(OrderItem.id == item_id).first()

    if not order_item:
        raise HTTPException(status_code= status.HTTP_404_NOT_FOUND, detail="Order item not found")\

    ready_status = get_order_item_status_by_alias(db, READY_ORDER_ITEM_ALIAS)
    served_status = get_order_item_status_by_alias(db, SERVED_ORDER_ITEM_ALIAS)

    owning_session = (
        db.query(DiningSession)
        .join(Guest, Guest.session_id == DiningSession.id)
        .join(Order, Order.guest_id == Guest.id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .filter(OrderItem.id == item_id)
        .first()
    )
    if not owning_session:
        raise HTTPException(status_code=404, detail="Owning session not found")

    _ensure_session_owner_or_admin(owning_session, current_staff)

    if order_item.status_id != ready_status.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order item {item_id} is not in 'ready' status and cannot be marked as served."
        )

    order_item.status_id = served_status.id
    db.commit()
    db.refresh(order_item)

    broadcast_staff_dashboard(db)

    broadcast_active_tickets(db)
    guest_id = (
        db.query(Order.guest_id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .filter(OrderItem.id == item_id)
        .scalar()
    )
    if guest_id is not None:
        publish_guest_event(guest_id, "orders.changed")

    return {
        "success": True,
        "message": f"Order item {item_id} successfully marked as served.",
        "item_id": order_item.id,
        "updated_status_id": served_status.id
    }


def resolve_service_request(db: Session, request_id: int, current_staff) -> dict:
    """
    Marks a service request as resolved and sets resolved_at in UTC.
    Raises 404 if request does not exist.
    Raises 409 if request is already resolved.
    """
    service_request = (
        db.query(ServiceRequest)
        .options(joinedload(ServiceRequest.dining_session))
        .filter(ServiceRequest.id == request_id)
        .first()
    )

    if service_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    _ensure_session_owner_or_admin(service_request.dining_session, current_staff)

    if service_request.resolved_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Service request is already resolved.",
        )

    resolved_status = get_service_request_status_by_alias(db, RESOLVED_SERVICE_REQUEST_ALIAS)

    service_request.status_id = resolved_status.id
    service_request.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(service_request)

    broadcast_staff_dashboard(db)
    publish_session_event(service_request.session_id, "service_requests.changed")

    return {
        "success": True,
        "message": f"Service request {request_id} successfully resolved.",
        "request_id": service_request.id,
        "updated_status_id": resolved_status.id,
        "updated_status_alias": resolved_status.alias,
        "resolved_at": service_request.resolved_at,
    }


def set_menu_item_availability(
    db: Session,
    item_id: int,
    is_available: bool,
) -> MenuItem:
    menu_item = db.get(MenuItem, item_id)

    if menu_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found",
        )

    menu_item.is_available = is_available
    db.commit()
    db.refresh(menu_item)

    publish_menu_event()

    return menu_item
 
def deactivate_session(db: Session, session_id: int, current_staff) -> dict:
    """
    Deactivates a dining session and sets its end time to the current UTC time[cite: 1].
    Raises an HTTP 404 error if the session is not found, or an HTTP 409 error if the session is already marked inactive[cite: 1].
    """
    session = db.query(DiningSession).filter(DiningSession.id == session_id).first()

    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dining session not found.")

    _ensure_session_owner_or_admin(session, current_staff)

    if not session.is_active:
        raise HTTPException(
            status_code=409,
            detail="Dining session is already inactive.",
        )

    cancelled_status = get_order_item_status_by_alias(
        db,
        CANCELLED_ORDER_ITEM_ALIAS,
    )

    active_items = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Guest, Order.guest_id == Guest.id)
        .join(OrderItemStatus, OrderItem.status_id == OrderItemStatus.id)
        .filter(
            Guest.session_id == session.id,
            func.lower(OrderItemStatus.alias).in_(
                [
                    "pending",
                    "preparing",
                    "ready",
                ]
            ),
        )
        .all()
    )

    for item in active_items:
        item.status_id = cancelled_status.id

    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    session.waiter_id = None
    db.commit()
    db.refresh(session)

    publish_session_event(session.id, "session.changed")

    broadcast_active_tickets(db)
    broadcast_staff_dashboard(db)
    
    return {
        "success": True,
        "session_id": session.id,
        "is_active": session.is_active
        }


def list_open_service_requests(db: Session, current_staff: Staff, limit: int = 50, offset: int = 0):

    query = (
        db.query(ServiceRequest)
        .join(ServiceRequest.dining_session)
        .join(ServiceRequest.status)
        .options(
            joinedload(ServiceRequest.dining_session).joinedload(DiningSession.restaurant_table),
            joinedload(ServiceRequest.status),
        )
        .filter(
            DiningSession.is_active == True, 
            ServiceRequest.resolved_at.is_(None), 
            func.lower(ServiceRequestStatus.alias) == PENDING_SERVICE_REQUEST_ALIAS
        )
    )

    if staff_role(current_staff) != StaffRoleEnum.ADMIN:
        query = query.filter(DiningSession.waiter_id == current_staff.id)

    results = (
        query.order_by(ServiceRequest.created_at.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    items = []
    for r in results:
        items.append({
            "id": r.id,
            "type_id": r.type_id,
            "type": r.type,
            "table_session_id": r.session_id,
            "is_high_priority": getattr(r, "is_high_priority", False),
            "created_at": r.created_at,
            "note": getattr(r, "note", None),
        })
    return items

def get_session_detail(db: Session, session_id: int):
    s = db.query(DiningSession).filter(DiningSession.id == session_id).first()
    if not s:
        return None
    # guests
    guests = db.query(Guest).filter(Guest.session_id == session_id).all()
    # orders & items
    orders = db.query(Order).join(Guest).filter(Guest.session_id == session_id).all()
    orders_serialized = []
    for o in orders:
        items = [{"id": it.id, "menu_item_id": it.menu_item_id, "qty": it.qty, "status_id": it.status_id} for it in o.items]
        orders_serialized.append({"order_id": o.id, "guest_id": o.guest_id, "items": items, "total": getattr(o, "total", None)})

    # open requests for this session
    pending = get_service_request_status_by_alias(db, PENDING_SERVICE_REQUEST_ALIAS)
    open_requests = []
    if pending:
        open_requests = db.query(ServiceRequest).filter(ServiceRequest.session_id == session_id, ServiceRequest.status_id == pending.id).all()
    requests_serialized = [{"id": r.id, "type_id": r.type_id, "created_at": r.created_at, "is_high_priority": getattr(r, "is_high_priority", False)} for r in open_requests]

    return {
        "id": s.id,
        "table_id": s.table_id,
        "is_active": s.is_active,
        "is_approved": s.is_approved,
        "guests_count": s.num_clients,
        "orders": orders_serialized,
        "open_requests": requests_serialized
    }

def get_service_request_detail(db, request_id: int):
    r = (
        db.query(ServiceRequest)
        .join(ServiceRequest.dining_session)
        .join(ServiceRequest.status)
        .filter(
            ServiceRequest.id == request_id,
            DiningSession.is_active == True,
            ServiceRequest.resolved_at.is_(None),
            func.lower(ServiceRequestStatus.alias) == PENDING_SERVICE_REQUEST_ALIAS
        )
        .first()  
    )

    if not r:
        return None

    return {
        "id": r.id,
        "session_id": r.session_id,
        "table_number": (
            r.dining_session.restaurant_table.table_number
            if r.dining_session and r.dining_session.restaurant_table
            else None
        ),
        "type": r.type,  # string in your current model
        "is_high_priority": getattr(r, "is_high_priority", False),
        "status": r.status.name if r.status else None,
        "created_at": r.created_at,
        "resolved_at": r.resolved_at,
        "is_open": r.resolved_at is None,
    }

def list_staff_sessions(
        db: Session,
        limit: int = 50,
        offset: int = 0,
        only_active: bool = True,
):
    q = db.query(DiningSession).options(joinedload(DiningSession.restaurant_table))

    if only_active:
        q = q.filter(DiningSession.is_active == True)

        sessions = q.order_by(DiningSession.start_time.desc()).limit(limit).offset(offset).all()

        items = []
        for s in sessions:
            items.append({
                "id": s.id,
                "table_number": s.restaurant_table.table_number if s.restaurant_table else None,
                "is_active": s.is_active,
                "is_approved": s.is_approved,
                "guests_count": s.num_clients,
                "start_time": s.start_time,
                "end_time": s.end_time
            })

        return items

def associate_staff_to_tables(db: Session) -> tuple[Staff, int]:
    """
    Randomly associates a staff member to a table for demonstration purposes.
    Returns the staff member and the table number they are associated with.
    """

    waiters = (
        db.query(Staff)
        .join(Staff.staff_role)
        .filter(
            Staff.is_active.is_(True),
            func.lower(StaffRole.alias) == "waiter"
        )
        .all()
    )

    if not waiters:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active waiters available for table association."
        )

    waiter_ids = [w.id for w in waiters]

    load_rows = (
        db.query(DiningSession.waiter_id, func.count(DiningSession.id))
        .filter(
            DiningSession.is_active.is_(True),
            DiningSession.is_approved.is_(True),
            DiningSession.waiter_id.in_(waiter_ids)
        )
        .group_by(DiningSession.waiter_id)
        .all()
    )

    loads = {wid:0 for wid in waiter_ids}
    for wid, cnt in load_rows:
        loads[wid] = cnt


    min_load = min(loads.values())
    tied_ids = [wid for wid, cnt in loads.items() if cnt == min_load]
    chosen_id = random.choice(tied_ids)
    chosen_waiter = next(w for w in waiters if w.id == chosen_id)

    return chosen_waiter, min_load


def _ensure_session_owner_or_admin(session: DiningSession, current_staff) -> None:
    if staff_role(current_staff) == StaffRoleEnum.ADMIN:
        return

    if session.waiter_id != current_staff.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only interact with your own assigned tables.",
        )
def get_session_bill(
    db: Session,
    session_id: int,
    current_staff: Staff,
) -> StaffSessionBillResponse:
    session = (
        db.query(DiningSession)
        .options(
            joinedload(DiningSession.guests).joinedload(Guest.buffet),
            joinedload(DiningSession.payment),
        )
        .filter(DiningSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dining session not found.",
        )

    payment = session.payment
    guests_data: list[StaffSessionBillGuest] = []

    for index, guest in enumerate(session.guests, start=1):
        buffet_total = (
            Decimal(guest.buffet.price)
            if guest.buffet is not None
            else ZERO_MONEY
        )

        extras_total = calculate_guest_extras_total(
            db=db,
            guest_id=guest.id,
        )

        guests_data.append(
            StaffSessionBillGuest(
                guest_id=guest.id,
                label=f"Guest {index}",
                buffet_total=buffet_total,
                extras_total=extras_total,
                total=buffet_total + extras_total,
            )
        )

    subtotal = sum(
        (guest.total for guest in guests_data),
        ZERO_MONEY,
    )

    waste_total = calculate_waste_total(
        session_guests=session.guests,
        payment=payment,
    )

    tip_amount = (
        Decimal(payment.tip_amount)
        if payment is not None
        else ZERO_MONEY
    )

    return StaffSessionBillResponse(
        session_id=session.id,
        guests=guests_data,
        subtotal=subtotal,
        waste_box_count=payment.waste_count if payment is not None else 0,
        waste_total=waste_total,
        tip_amount=tip_amount,
        total=subtotal + waste_total + tip_amount,
        is_paid=payment is not None,
        paid_at=payment.paid_at if payment is not None else None,
    )

def register_payment_and_close_session(
    db: Session,
    session_id: int,
    payment_data: StaffPaymentCreate,
    current_staff: Staff,
) -> StaffPaymentResponse:
    session = (
        db.query(DiningSession)
        .options(
            joinedload(DiningSession.guests).joinedload(Guest.buffet),
            joinedload(DiningSession.payment),
        )
        .filter(DiningSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dining session not found.",
        )

    _ensure_session_owner_or_admin(session, current_staff)

    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dining session is already closed.",
        )

    if session.payment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This session already has a payment.",
        )

    session_guests = session.guests

    buffet_total = sum(
        (
            Decimal(guest.buffet.price)
            for guest in session_guests
            if guest.buffet is not None
        ),
        ZERO_MONEY,
    )

    extras_total = calculate_extras_total(
        db=db,
        session_id=session.id,
    )

    payment_preview = Payment(
        waste_count=payment_data.waste_count,
    )

    waste_total = calculate_waste_total(
        session_guests=session_guests,
        payment=payment_preview,
    )

    total_amount = (
        buffet_total
        + extras_total
        + waste_total
        + payment_data.tip_amount
    )

    now = datetime.now(timezone.utc)

    payment = Payment(
        session_id=session.id,
        amount_paid=total_amount,
        tip_amount=payment_data.tip_amount,
        method=payment_data.method.strip().lower(),
        waste_count=payment_data.waste_count,
        paid_at=now,
    )

    payment_request_type = get_service_request_type_by_alias(
        db,
        PAYMENT_REQUEST_TYPE,
    )
    resolved_status = get_service_request_status_by_alias(
        db,
        RESOLVED_SERVICE_REQUEST_ALIAS,
    )

    open_payment_requests = (
        db.query(ServiceRequest)
        .filter(
            ServiceRequest.session_id == session.id,
            ServiceRequest.type_id == payment_request_type.id,
            ServiceRequest.resolved_at.is_(None),
        )
        .all()
    )

    for request in open_payment_requests:
        request.status_id = resolved_status.id
        request.resolved_at = now

    session.is_active = False
    session.end_time = now

    db.add(payment)
    db.commit()
    db.refresh(payment)

    broadcast_staff_dashboard(db)

    return StaffPaymentResponse(
        session_id=session.id,
        amount_paid=Decimal(payment.amount_paid),
        method=payment.method,
        tip_amount=Decimal(payment.tip_amount),
        waste_count=payment.waste_count,
        paid_at=payment.paid_at,
    )
