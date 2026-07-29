# backend/app/modules/client/dependencies.py

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.restaurant_table import RestaurantTable
from app.modules.client.security import hash_device_token

DeviceTokenHeader = Annotated[
    str | None,
    Header(alias="X-Device-Token")
]


# Find table by code
def find_table(
    table_code: str,
    db: Session,
) -> RestaurantTable:
    try:
        normalized_code = str(UUID(table_code.strip()))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    table = db.scalar(
        select(RestaurantTable).where(
            RestaurantTable.public_code == normalized_code,
        )
    )

    if table is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    return table

# Find active session for a table
def find_active_session(
    table_id: int,
    db: Session,
    *,
    lock: bool = False,
) -> DiningSession:
    query = select(DiningSession).where(
        DiningSession.table_id == table_id,
        DiningSession.is_active.is_(True),
    )

    if lock:
        query = query.with_for_update()

    dining_session = db.scalar(query)

    if dining_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This table does not have an active session",
        )

    return dining_session

# Require current guest based on device token and table code
def require_current_guest(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
    device_token: DeviceTokenHeader = None,
) -> Guest:
    if (
        device_token is None
        or not 32 <= len(device_token) <= 128
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client token",
        )

    table = find_table(table_code, db)
    dining_session = find_active_session(table.id, db)

    if not dining_session.is_approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session has not been approved yet",
        )

    token_hash = hash_device_token(device_token)

    guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        )
    )

    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client token",
        )

    return guest

CurrentGuest = Annotated[
    Guest,
    Depends(require_current_guest),
]