from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload   

from app.db.dependencies import get_db
from app.schemas.staff.staff_contract import (StaffDashboard)
from app.services import staff_service

router = APIRouter(
    prefix="/staff",
    tags=["Staff"]
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
