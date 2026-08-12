# backend/app/modules/client/routes/tables.py

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.staff.websockets.staff_realtime import broadcast_staff_dashboard

from app.models.dining_session import DiningSession
from app.models.restaurant_table import RestaurantTable
from app.modules.client.dependencies import (
    CurrentDiningSession,
    CurrentTable,
    DeviceTokenHeader,
    DbSession,
    find_current_guest,
)
from app.modules.client.schemas import (
    ClientSessionStateResponse,
    SessionCreate,
    SessionResponse,
    TableResponse,
)

router = APIRouter(tags=["Client - Tables & Sessions"],)

@router.get(
    "/tables/{table_code}",
    response_model=TableResponse,
)
def get_table(
    table: CurrentTable,
) -> RestaurantTable:
    return table


@router.get(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
)
def get_active_session(
    dining_session: CurrentDiningSession,
) -> DiningSession:
    return dining_session


@router.get(
    "/tables/{table_code}/sessions/{session_id}/state",
    response_model=ClientSessionStateResponse,
)
def get_session_state(
    session_id: int,
    table: CurrentTable,
    db: DbSession,
    device_token: DeviceTokenHeader = None,
) -> ClientSessionStateResponse:
    dining_session = db.scalar(
        select(DiningSession).where(
            DiningSession.id == session_id,
            DiningSession.table_id == table.id,
        )
    )

    if dining_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if device_token is None or find_current_guest(
        dining_session=dining_session,
        device_token=device_token,
        db=db,
    ) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de cliente inválido",
        )

    if dining_session.payment is not None:
        session_status = "completed"
    elif dining_session.is_active:
        session_status = "active"
    else:
        session_status = "closed"

    return ClientSessionStateResponse(
        session=dining_session,
        status=session_status,
    )


@router.post(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    session_data: SessionCreate,
    table: CurrentTable,
    db: DbSession,
) -> DiningSession:
    if session_data.num_clients > table.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O número de clientes excede a capacidade da mesa",
        )

    active_session_id = db.scalar(
        select(DiningSession.id).where(
            DiningSession.table_id == table.id,
            DiningSession.is_active.is_(True),
        )
    )

    if active_session_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The table already has an active session",
        )

    dining_session = DiningSession(
        table_id=table.id,
        num_clients=session_data.num_clients,
        is_active=True,
        is_approved=False,
    )

    db.add(dining_session)

    try:
        db.commit()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The table already has an active session",
        ) from exc

    broadcast_staff_dashboard(db)
    db.refresh(dining_session)
    return dining_session
