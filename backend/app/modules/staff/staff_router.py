from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.modules.staff.staff_contract import (
    StaffDashboard,
    StaffPaymentCreate,
    StaffPaymentHistoryFilters,
    StaffPaymentHistoryListOut,
    StaffPaymentResponse,
    StaffSessionBillResponse,
    StaffSessionHistoryListOut,
)
from app.modules.staff import staff_service

from app.api.deps import get_current_staff, require_role
from app.api.routes.auth import staff_to_out
from app.core.roles import StaffRoleEnum
from app.models.staff import Staff
from app.schemas.auth import CreateStaffRequest, StaffOut

router = APIRouter(prefix="/staff")


# Staff management (Admin-only)
@router.post(
    "",
    response_model=StaffOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Staff - Management"],
    dependencies=[Depends(require_role())],
)
def create_staff(payload: CreateStaffRequest, db: Session = Depends(get_db)) -> StaffOut:
    staff = staff_service.create_staff(db, payload)
    return staff_to_out(staff)


# Dashboard
@router.get(
    "/dashboard",
    response_model=StaffDashboard,
    tags=["Staff - Dashboard"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def get_staff_dashboard(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff),
) -> StaffDashboard:
    return staff_service.get_staff_dashboard(db, current_staff)


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
def deactivate_session(session_id: int, db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff),):
    return staff_service.deactivate_session(db, session_id, current_staff)


# Services
@router.patch(
    "/orders/items/{item_id}/serve",
    tags=["Staff - Services"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def mark_item_as_served(item_id: int, db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    return staff_service.mark_item_as_served(db, item_id, current_staff)


@router.patch(
    "/requests/{request_id}/resolve",
    tags=["Staff - Services"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))]
)
def resolve_request(request_id: int, db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    return staff_service.resolve_service_request(db, request_id, current_staff)


@router.get("/requests", tags=["Staff - Services"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def list_staff_requests(db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff), limit: int = 50, offset: int = 0):
    """
    Returns open (pending) service requests for staff dashboard.
    """
    requests = staff_service.list_open_service_requests(db, current_staff,limit=limit, offset=offset)
    return {"success": True, "count": len(requests), "items": requests}


@router.get("/sessions/{session_id}", tags=["Staff - Table management"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def get_staff_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff),
):
    session = staff_service.get_session_detail(
        db,
        session_id,
        current_staff,
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"success": True, "session": session}


@router.get("/requests/{request_id}", tags=["Staff - Services"], dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def get_staff_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff),
):
    item = staff_service.get_service_request_detail(
        db,
        request_id,
        current_staff,
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return {"success": True, "request": item}


@router.get(
    "/sessions",
    response_model=StaffSessionHistoryListOut,
    tags=["Staff - Table management"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))],
)
def list_staff_sessions(
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    only_active: bool = True,
) -> StaffSessionHistoryListOut:
    return staff_service.list_staff_sessions(
        db=db,
        limit=limit,
        offset=offset,
        only_active=only_active,
    )

@router.post(
    "/sessions/{session_id}/payment",
    response_model=StaffPaymentResponse,
    tags=["Staff - Payments"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))],
)
def register_payment(
    session_id: int,
    payment_data: StaffPaymentCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff),
):
    return staff_service.register_payment_and_close_session(
        db,
        session_id,
        payment_data,
        current_staff,
    )

@router.get(
    "/sessions/{session_id}/bill",
    response_model=StaffSessionBillResponse,
    tags=["Staff - Payments"],
    dependencies=[Depends(require_role(StaffRoleEnum.WAITER))],
)
def get_session_bill(
    session_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff),
):
    return staff_service.get_session_bill(
        db,
        session_id,
        current_staff,
    )


StaffPaymentHistoryQuery = Annotated[StaffPaymentHistoryFilters, Depends()]


@router.get(
    "/payments",
    response_model=StaffPaymentHistoryListOut,
    tags=["Staff - Payments"],
    dependencies=[Depends(require_role())],
)
def get_payment_history(
    filters: StaffPaymentHistoryQuery,
    db: Session = Depends(get_db),
) -> StaffPaymentHistoryListOut:
    return staff_service.get_payment_history(db, filters)
