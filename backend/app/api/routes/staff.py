from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.schemas.staff.staff_contract import StaffDashboard
from app.services import staff_service
from app import db

from app.api.deps import get_current_staff, require_role
from app.core.roles import StaffRoleEnum
from app.models.staff import Staff

router = APIRouter(prefix="/staff")


# Dashboard
@router.get(
    "/dashboard",
    response_model=StaffDashboard,
    tags=["Staff - Dashboard"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def get_staff_dashboard(db: Session = Depends(get_db)) -> StaffDashboard:
    return staff_service.get_staff_dashboard(db)


# Table management (approval + deactivation)
@router.post(
    "/sessions/{session_id}/approve",
    tags=["Staff - Table management"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def approve_session(session_id: int, db: Session = Depends(get_db), approver: Staff = Depends(get_current_staff)):
    return staff_service.approve_session(db, session_id, approver.id)


@router.patch(
    "/sessions/{session_id}/deactivate",
    tags=["Staff - Table management"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
    )
def deactivate_session(session_id: int, db: Session = Depends(get_db)):
    return staff_service.deactivate_session(db, session_id)


# Services
@router.patch(
    "/orders/items/{item_id}/serve",
    tags=["Staff - Services"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def mark_item_as_served(item_id: int, db: Session = Depends(get_db)):
    return staff_service.mark_item_as_served(db, item_id)


@router.patch(
    "/requests/{request_id}/resolve",
    tags=["Staff - Services"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def resolve_request(request_id: int, db: Session = Depends(get_db)):
    return staff_service.resolve_service_request(db, request_id)

@router.get("/requests", tags=["Staff - Services"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def list_staff_requests(db: Session = Depends(get_db), limit: int = 50, offset: int = 0):
    """
    Returns open (pending) service requests for staff dashboard.
    """
    requests = staff_service.list_open_service_requests(db, limit=limit, offset=offset)
    return {"success": True, "count": len(requests), "items": requests}

@router.get("/sessions/{session_id}", tags=["Staff - Table management"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def get_staff_session(session_id: int, db: Session = Depends(get_db)):
    """
    Detailed session view including guests, orders, items, and open service requests.
    """
    session = staff_service.get_session_detail(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"success": True, "session": session}

@router.get("/requests/{request_id}", tags=["Staff - Services"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def get_staff_request(request_id: int, db: Session = Depends(get_db)):
    item = staff_service.get_service_request_detail(db, request_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return {"success": True, "request": item}

@router.get("/sessions", tags=["Staff - Table management"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def list_staff_sessions(
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    only_active: bool = True,
):
    items = staff_service.list_staff_sessions(
        db=db,
        limit=limit,
        offset=offset,
        only_active=only_active,
    )
    return {"success": True, "count": len(items), "items": items}