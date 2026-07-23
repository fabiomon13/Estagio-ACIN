from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload   

from app.db.dependencies import get_db
from app.models.dining_session import DiningSession
from backend.app.models.order import Order
from backend.app.models.order_item import OrderItem
from backend.app.models.service_request import ServiceRequest
ServiceRequest, OrderItem, Order
from app.schemas.staff.staff_contract import (
    StaffDashboard,
    StaffDashboardSummary,
    StaffDashboardTable,
    StaffOpenRequest,
    StaffTableState,
)

router = APIRouter(
    prefix="/staff",
    tags=["Staff"]
)

@router.get(
    "/dashboard",
    response_model=StaffDashboard,
)

def get_staff_dashboard(db: Session = Depends(get_db)) -> StaffDashboard:

    active_sessions = db.query(DiningSession).options(
        joinedload(DiningSession.restaurant_table)).filter(DiningSession.is_active == True).all()

    occupied_tables = len(active_sessions)
    guest_count = sum(session.num_clients for session in active_sessions)

    tables_data = []
    for session in active_sessions:
        state = StaffTableState.ACTIVE if session.is_approved else StaffTableState.AwAITING_APPROVAL

        total_amount = db.query(func.sum(OrderItem.unit_price_at_order * OrderItem.quantity))\
            .join(Order, Order.id == OrderItem.order_id)\
                .filter(Order.guest.id == session.id)\
                    .scalar() or 0.0

        ready_item_count = db.query(OrderItem).join(Order).filter(
                    Order.guest_id == session.id, OrderItem.is_ready == True).count()
        
        tables_data.append(
            StaffDashboardTable(
                session_id=session.id,
                table_number=session.restaurant_table.number if session.restaurant_table else None,
                guest_count=session.num_clients,
                state=state,
                started_at=session.start_time,
                ready_item_count=ready_item_count,
                total=f"${total_amount:.2f}"
            )
        )

        open_requests = db.query(ServiceRequest).join(ServiceRequest.dining_session)\
        .options(joinedload(ServiceRequest.dining_session).joinedload(DiningSession.table))\
        .filter(DiningSession.is_active == True).all()

        requests_data = [
            StaffOpenRequest(
                id=request.id,
                table_number=request.dining_session.restaurant_table.number if request.dining_session and request.dining_session.restaurant_table else None,
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