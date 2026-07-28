from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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

router = APIRouter(prefix="/staff")


# Dashboard
@router.get(
    "/dashboard",
    response_model=StaffDashboard,
    tags=["Staff - Dashboard"],
)
def get_staff_dashboard(db: Session = Depends(get_db)) -> StaffDashboard:
    return staff_service.get_staff_dashboard(db)


# Table management (approval + deactivation)
@router.post(
    "/sessions/{session_id}/approve",
    tags=["Staff - Table management"],
)
def approve_session(session_id: int, db: Session = Depends(get_db)):
    return staff_service.approve_session(db, session_id)


@router.patch(
    "/sessions/{session_id}/deactivate",
    tags=["Staff - Table management"],
)
def deactivate_session(session_id: int, db: Session = Depends(get_db)):
    return staff_service.deactivate_session(db, session_id)


# Services
@router.patch(
    "/orders/items/{item_id}/serve",
    tags=["Staff - Services"],
)
def mark_item_as_served(item_id: int, db: Session = Depends(get_db)):
    return staff_service.mark_item_as_served(db, item_id)


@router.patch(
    "/requests/{request_id}/resolve",
    tags=["Staff - Services"],
)
def resolve_request(request_id: int, db: Session = Depends(get_db)):
    return staff_service.resolve_service_request(db, request_id)
