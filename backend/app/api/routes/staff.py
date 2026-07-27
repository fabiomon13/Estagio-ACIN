from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.order_item import OrderItem

from app.api.deps import require_role
from app.core.roles import StaffRoleEnum
from app.db.dependencies import get_db
from app.models.staff import Staff
from app.schemas.staff.staff_contract import (
    MenuItemAvailabilityResponse,
    MenuItemAvailabilityUpdate,
    StaffDashboard,
)
from app.services import staff_service

router = APIRouter(
    prefix="/staff",
    tags=["Staff Dashboard"]
)

@router.get(
    "/dashboard",
    response_model=StaffDashboard,
)

def get_staff_dashboard(db: Session = Depends(get_db)) -> StaffDashboard:

    return staff_service.get_staff_dashboard(db)

@router.post("/sessions/{session_id}/approve")

def approve_session(session_id: int, db: Session = Depends(get_db)):

    return staff_service.approve_session(db, session_id)

@router.patch("/orders/items/{item_id}/serve")

def mark_item_as_served(item_id: int, db: Session = Depends(get_db)):

    return staff_service.mark_item_as_served(db, item_id)


@router.patch(
    "/menu-items/{item_id}/availability",
    response_model=MenuItemAvailabilityResponse,
)
def set_menu_item_availability(
    item_id: int,
    data: MenuItemAvailabilityUpdate,
    db: Session = Depends(get_db),
    _staff: Staff = Depends(require_role(StaffRoleEnum.CHEF)),
) -> MenuItemAvailabilityResponse:
    return staff_service.set_menu_item_availability(
        db,
        item_id,
        data.is_available,
    )
