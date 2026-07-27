from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.order_item import OrderItem

from app.db.dependencies import get_db
from app.schemas.staff.staff_contract import (StaffDashboard)
from app.services import staff_service
from backend.app.api.deps import require_role
from backend.app.core.roles import StaffRoleEnum
from backend.app.models.staff import Staff

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

@router.post("/sessions/{session_id}/approve", dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])

def approve_session(session_id: int, db: Session = Depends(get_db)):

    return staff_service.approve_session(db, session_id)

@router.patch("/orders/items/{item_id}/serve")

def mark_item_as_served(item_id: int, db: Session = Depends(get_db)):

    return staff_service.mark_item_as_served(db, item_id)   


@router.post("/sessions/{session_id}/payment-request", dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])

def request_payment(session_id: int, db: Session = Depends(get_db)):

    return staff_service.request_payment(db, session_id) 