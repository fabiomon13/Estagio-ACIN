from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload   

from app.models.dining_session import DiningSession
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.guest import Guest
from app.models.menu_item import MenuItem
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

        # Calculate table total
        total_amount = db.query(func.sum(OrderItem.unit_price_at_order * OrderItem.quantity))\
            .join(Order, Order.id == OrderItem.order_id)\
                .filter(Order.guest_id == session.id)\
                    .scalar() or 0.0

        # Count ready items for summary
        ready_items = db.query(OrderItem).join(Order, Order.id == OrderItem.order_id).join(Guest, Guest.id == Order.guest_id).filter(
                    Guest.session_id == session.id, OrderItem.status_id == 3).all()

        
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
    .filter(DiningSession.is_active == True).all()

    requests_data = [
        StaffOpenRequest(
            id=request.id,
            table_number=request.dining_session.restaurant_table.table_number if request.dining_session and request.dining_session.restaurant_table else 0,
            type=request.type,
            is_high_priority=request.is_high_priority,
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

    order_item.status_id = 4  # Assuming '4' corresponds to 'Served'
    db.commit()

    db.refresh(order_item)

    return {
        "success": True,
        "message": f"Order item {item_id} successfully marked as served.",
        "item_id": order_item.id,
        "updated_status_id": order_item.status_id
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

    return menu_item
