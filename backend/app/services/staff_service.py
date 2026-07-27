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
from app import db
from backend.app.models.service_request_status import ServiceRequestStatus

READY_ORDER_ITEM_ALIAS = "ready"
SERVED_ORDER_ITEM_ALIAS = "served"
PAYMENT_REQUEST_TYPE = "payment_request"
PENDING_SERVICE_REQUEST_ALIAS = "pending"
RESOLVED_SERVICE_REQUEST_ALIAS = "resolved"

def get_order_item_status_by_alias(db: Session, alias: str) -> OrderItemStatus:

    """Fetches an OrderItemStatus by its alias."""

    status_row = db.query(OrderItemStatus)\
    .filter(func.lower(OrderItemStatus.alias) == alias.lower())\
    .first()
   
    if status_row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order item status with alias '{alias}' not found."
        )

    return status_row

def get_service_request_status_by_alias(db: Session, alias: str) -> ServiceRequestStatus:
    row = db.query(ServiceRequestStatus).filter(func.lower(ServiceRequestStatus.alias) == alias.lower()).first()
    if row is None:
        raise HTTPException(status_code=500, detail=f"Service request status '{alias}' is not configured")
    return row

def get_staff_dashboard(db: Session) -> StaffDashboard:

    """Fetches and formats all data for the staff dashboard."""

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
                .filter(Order.guest_id == session.id)\
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
    open_requests = db.query(ServiceRequest).join(ServiceRequest.dining_session)\
    .options(joinedload(ServiceRequest.dining_session).joinedload(DiningSession.restaurant_table))\
    .filter(DiningSession.is_active == True, ServiceRequest.resolved_at.is_(None)).all()

    requests_data = [
        StaffOpenRequest(
            id=request.id,
            table_number=request.dining_session.restaurant_table.table_number if request.dining_session and request.dining_session.restaurant_table else 0,
            type=request.type,
            priority=request.priority,
            created_at=request.created_at
        )
        for request in open_requests
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

def approve_session(db: Session, session_id: int) -> dict:

    session = db.query(DiningSession).filter(DiningSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Dining session not found")

    if session.is_approved:
        raise HTTPException(status_code=400, detail="Dining session is already approved")

    session.is_approved = True
    db.commit()

    return {
        "message": "Dining session approved successfully",
        "session_id": session_id,
        "is_approved": session.is_approved
            }

def mark_item_as_served(db: Session, item_id: int) -> dict:

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

def request_payment(db: Session, session_id: int) -> dict:

    session = (db.query(DiningSession).filter(DiningSession.id == session_id, DiningSession.is_active == True).first())

    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dining session not found or inactive.")

    existing_request = (db.query(ServiceRequest).filter(
        ServiceRequest.session_id == session.id,
        ServiceRequest.type == PAYMENT_REQUEST_TYPE,
        ServiceRequest.resolved_at.is_(None)
        ).first()
    )

    if existing_request is not None:
        raise HTTPException(status_code = 409, detail="A payment request for this session already exists.")

    payment_status = get_service_request_status_by_alias(db, Pending_SERVICE_REQUEST_ALIAS)

    new_request = ServiceRequest(
        session_id=session.id,
        status_id=payment_status.id,
        type=PAYMENT_REQUEST_TYPE,
        priority= "urgent",
        resolved_at=None
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return {"success": True, "request_id": new_request.id, "session_id": session.id} 

def resolve_service_request(db: Session, request_id: int) -> dict:

    service_request = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()

    if not service_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found.")

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
        "resolved_at": service_request.resolved_at
    }