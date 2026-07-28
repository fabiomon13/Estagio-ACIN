from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.schemas.staff.staff_contract import StaffDashboard
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

@router.get("/requests", tags=["Staff - Services"])
def list_staff_requests(db: Session = Depends(get_db), limit: int = 50, offset: int = 0):
    """
    Returns open (pending) service requests for staff dashboard.
    """
    requests = staff_service.list_open_service_requests(db, limit=limit, offset=offset)
    return {"success": True, "count": len(requests), "items": requests}

@router.get("/sessions/{session_id}", tags=["Staff - Table management"])
def get_staff_session(session_id: int, db: Session = Depends(get_db)):
    """
    Detailed session view including guests, orders, items, and open service requests.
    """
    session = staff_service.get_session_detail(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"success": True, "session": session}

@router.get("/requests/{request_id}", tags=["Staff - Services"])
def get_staff_request(request_id: int, db: Session = Depends(get_db)):
    item = staff_service.get_service_request_detail(db, request_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return {"success": True, "request": item}