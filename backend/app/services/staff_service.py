from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload   

from app.models.dining_session import DiningSession
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.service_request import ServiceRequest
from app.schemas.staff.staff_contract import (
    StaffDashboard,
    StaffDashboardSummary,
    StaffDashboardTable,
    StaffOpenRequest,
    StaffTableState,
)

def get_staff_dashboard(db: Session) -> StaffDashboard:

    active_sessions = db.query(DiningSession).options(
        joinedload(DiningSession.restaurant_table)).filter(DiningSession.is_active == True).all()

    occupied_tables = len(active_sessions)
    guest_count = sum(session.num_clients for session in active_sessions)

    tables_data = []
    for session in active_sessions:
        state = StaffTableState.ACTIVE if session.is_approved else StaffTableState.AWAITING_APPROVAL

        total_amount = db.query(func.sum(OrderItem.unit_price_at_order * OrderItem.quantity))\
            .join(Order, Order.id == OrderItem.order_id)\
                .filter(Order.guest_id == session.id)\
                    .scalar() or 0.0

        ready_item_count = db.query(OrderItem).join(Order).filter(
                    Order.guest_id == session.id, OrderItem.status_id == 3).count()
        
        tables_data.append(
            StaffDashboardTable(
                session_id=session.id,
                table_number=session.restaurant_table.table_number if session.restaurant_table else None,
                guest_count=session.num_clients,
                state=state,
                started_at=session.start_time,
                ready_item_count=ready_item_count,
                total=f"${total_amount:.2f}"
            )
        )

    open_requests = db.query(ServiceRequest).join(ServiceRequest.dining_session)\
    .options(joinedload(ServiceRequest.dining_session).joinedload(DiningSession.restaurant_table))\
    .filter(DiningSession.is_active == True).all()

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
        ready_to_serve = [],
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