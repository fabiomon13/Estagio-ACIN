from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload   
from datetime import datetime, timezone

from app.models.dining_session import DiningSession
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.guest import Guest
from app.models.service_request import ServiceRequest
from app.schemas.staff.staff_contract import (
    StaffDashboard,
    StaffDashboardSummary,
    StaffDashboardTable,
    StaffOpenRequest,
    StaffTableState,
    StaffReadyTable,
    StaffReadyItem
)
from app.models.service_request_type import ServiceRequestType
from app.models.service_request_status import ServiceRequestStatus
from app.models.staff import Staff
from app.models.staff_role import StaffRole
import random

READY_ORDER_ITEM_ALIAS = "ready"
SERVED_ORDER_ITEM_ALIAS = "served"

PAYMENT_REQUEST_TYPE = "payment_request"
ASSISTANCE_REQUEST_TYPE = "assistance"

PENDING_SERVICE_REQUEST_ALIAS = "pending"
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
    active_sessions = db.query(DiningSession).options(
        joinedload(DiningSession.restaurant_table)).filter(DiningSession.is_active == True).all()

    occupied_tables = len(active_sessions)
    guest_count = sum(session.num_clients for session in active_sessions)

    tables_data = []
    ready_to_serve_table = []

    for session in active_sessions:
        state = StaffTableState.ACTIVE if session.is_approved else StaffTableState.AWAITING_APPROVAL

        ready_status = get_order_item_status_by_alias(db, READY_ORDER_ITEM_ALIAS)

        # Calculate table total
        total_amount = db.query(func.sum(OrderItem.unit_price_at_order * OrderItem.quantity))\
            .join(Order, Order.id == OrderItem.order_id)\
            .join(Guest, Guest.id == Order.guest_id)\
            .filter(Guest.session_id == session.id)\
            .scalar() or 0.0

        # Count ready items for summary
        ready_items = db.query(OrderItem).join(Order, Order.id == OrderItem.order_id).join(Guest, Guest.id == Order.guest_id).filter(
                    Guest.session_id == session.id, OrderItem.status_id == ready_status.id).all()

        
        tables_data.append(
            StaffDashboardTable(
                session_id=session.id,
                table_number=session.restaurant_table.table_number if session.restaurant_table else None,
                guest_count=session.num_clients,
                state=state,
                started_at=session.start_time,
                ready_item_count=len(ready_items),
                total=f"${total_amount:.2f}"
            )
        )


        if ready_items:
            items_payload = [
                StaffReadyItem(
                    id=item.id,
                    name=item.menu_item.name if item.menu_item else "Unknown Item",
                    quantity=item.quantity
                ) 
                for item in ready_items
            ]

            ready_to_serve_table.append(
                StaffReadyTable(
                    table_number=session.restaurant_table.table_number if session.restaurant_table else None,
                    items=items_payload
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
        ready_to_serve = ready_to_serve_table,
        requests=requests_data,
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

    return {
        "message": "Dining session approved successfully",
        "session_id": session_id,
        "is_approved": session.is_approved,
        "approved_by_staff_id": approved_by_staff_id,
        "waiter_id": chosen_waiter.id,
        "waiter_name": chosen_waiter.name,
        "waiter_active_tables_after_assignment": current_load + 1,
            }

def mark_item_as_served(db: Session, item_id: int) -> dict:
    """
    Updates a specific order item's status to 'served'[cite: 1].
    Raises an HTTP 404 error if the order item is not found, or an HTTP 400 error if the item is not currently in a 'ready' state[cite: 1].
    """
    order_item = db.query(OrderItem).filter(OrderItem.id == item_id).first()

    if not order_item:
        raise HTTPException(status_code= status.HTTP_404_NOT_FOUND, detail="Order item not found")\

    ready_status = get_order_item_status_by_alias(db, READY_ORDER_ITEM_ALIAS)
    served_status = get_order_item_status_by_alias(db, SERVED_ORDER_ITEM_ALIAS)

    if order_item.status_id != ready_status.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order item {item_id} is not in 'ready' status and cannot be marked as served."
        )

    order_item.status_id = served_status.id
    db.commit()

    db.refresh(order_item)

    return {
        "success": True,
        "message": f"Order item {item_id} successfully marked as served.",
        "item_id": order_item.id,
        "updated_status_id": served_status.id
    }


def resolve_service_request(db: Session, request_id: int) -> dict:
    """
    Marks a service request as resolved and sets resolved_at in UTC.
    Raises 404 if request does not exist.
    Raises 409 if request is already resolved.
    """
    service_request = (
        db.query(ServiceRequest)
        .filter(ServiceRequest.id == request_id)
        .first()
    )

    if service_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

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

    return {
        "success": True,
        "message": f"Service request {request_id} successfully resolved.",
        "request_id": service_request.id,
        "updated_status_id": resolved_status.id,
        "updated_status_alias": resolved_status.alias,
        "resolved_at": service_request.resolved_at,
    }

def deactivate_session(db: Session, session_id: int) -> dict:
    """
    Deactivates a dining session and sets its end time to the current UTC time[cite: 1].
    Raises an HTTP 404 error if the session is not found, or an HTTP 409 error if the session is already marked inactive[cite: 1].
    """
    session = db.query(DiningSession).filter(DiningSession.id == session_id).first()

    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dining session not found.")

    if not session.is_active:
        raise HTTPException(status_code= 409, detail="Dining session is already inactive.")

    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "session_id": session.id,
        "is_active": session.is_active
        }


def list_open_service_requests(db: Session, limit: int = 50, offset: int = 0):
    results = (
        db.query(ServiceRequest)
        .join(ServiceRequest.dining_session)
        .join(ServiceRequest.status)
        .options(joinedload(ServiceRequest.dining_session).joinedload(DiningSession.restaurant_table),
                 joinedload(ServiceRequest.status),
                 )
                 .filter(DiningSession.is_active == True, 
                         ServiceRequest.resolved_at.is_(None), 
                         func.lower(ServiceRequestStatus.alias) == PENDING_SERVICE_REQUEST_ALIAS)
                         )\
    .order_by(ServiceRequest.created_at.asc())\
    .limit(limit)\
    .offset(offset)\
    .all()


    items = []
    for r in results:
        items.append({
            "id": r.id,
            "type_id": r.type_id,
            "type_name": r.type,
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
