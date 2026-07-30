# backend/app/modules/client/dependencies.py
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.restaurant_table import RestaurantTable
from app.modules.client.security import (
    hash_device_token,
    hash_legacy_device_token,
)


DbSession = Annotated[Session, Depends(get_db)]

DeviceTokenHeader = Annotated[
    str | None,
    Header(
        alias="X-Device-Token",
        min_length=32,
        max_length=128,
    ),
]


def table_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Table not found",
    )


def active_session_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="This table does not have an active session",
    )


def find_table(
    table_code: str,
    db: Session,
) -> RestaurantTable:
    try:
        normalized_code = str(UUID(table_code.strip()))
    except ValueError:
        raise table_not_found() from None

    table = db.scalar(
        select(RestaurantTable).where(
            RestaurantTable.public_code == normalized_code,
        )
    )

    if table is None:
        raise table_not_found()

    return table


def find_active_session(
    table_id: int,
    db: Session,
    *,
    lock: bool = False,
) -> DiningSession:
    query: Select[tuple[DiningSession]] = select(
        DiningSession
    ).where(
        DiningSession.table_id == table_id,
        DiningSession.is_active.is_(True),
    )

    if lock:
        query = query.with_for_update()

    dining_session = db.scalar(query)

    if dining_session is None:
        raise active_session_not_found()

    return dining_session


def require_table(
    table_code: str,
    db: DbSession,
) -> RestaurantTable:
    return find_table(table_code, db)


CurrentTable = Annotated[
    RestaurantTable,
    Depends(require_table),
]


def require_active_session(
    table: CurrentTable,
    db: DbSession,
) -> DiningSession:
    return find_active_session(table.id, db)


CurrentDiningSession = Annotated[
    DiningSession,
    Depends(require_active_session),
]


def require_current_guest(
    dining_session: CurrentDiningSession,
    db: DbSession,
    device_token: DeviceTokenHeader = None,
) -> Guest:
    if device_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client token",
        )

    token_hashes = (
        hash_device_token(device_token),
        hash_legacy_device_token(device_token),
    )

    guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash.in_(token_hashes),
        )
    )

    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client token",
        )

    # Check if the session is approved and has a waiter assigned
    if (
        not dining_session.is_approved
        or dining_session.waiter_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session has not been approved yet",
        )

    return guest


CurrentGuest = Annotated[
    Guest,
    Depends(require_current_guest),
]