# backend/app/modules/client/dependencies.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.dining_session import DiningSession
from app.models.restaurant_table import RestaurantTable
from app.modules.client.dependencies import (
    find_active_session,
    find_table,
)
from app.modules.client.schemas import (
    SessionCreate,
    SessionResponse,
    TableResponse,
)

router = APIRouter(
    tags=["Client - Tables & Sessions"]
)

# Get table endpoint
@router.get(
    "/tables/{table_code}",
    response_model=TableResponse
)
def get_table(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> RestaurantTable:
    # Find the table based on the provided table code and return it. If the table is not found, raise a 404 HTTP exception.
    return find_table(table_code, db)

# Get active session endpoint
@router.get(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
)
def get_active_session(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    # Find the table based on the provided table code and then find the active session for that table.
    table = find_table(table_code, db)

    # Return the active session for the table.
    return find_active_session(table.id, db)

# Create session endpoint
@router.post(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    table_code: str,
    session_data: SessionCreate,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    # Find the table based on the provided table code
    table = find_table(table_code, db)

    # Check if the number of clients exceeds the table's maximum capacity. If it does, raise a 422 HTTP exception.
    if session_data.num_clients > table.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The number of clients exceeds the table's capacity",
        )

    existing_session = db.scalar(
        select(DiningSession).where(
            DiningSession.table_id == table.id,
            DiningSession.is_active.is_(True),
        )
    )

    # If there is an existing active session, raise a 409 HTTP exception indicating that the table already has an active session.
    if existing_session is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Table already has an active session",
        )

    # Create a new dining session with the provided number of clients and set it as active but not approved.
    dining_session = DiningSession(
        table_id=table.id,
        num_clients=session_data.num_clients,
        is_active=True,
        is_approved=False,
    )

    # Add the new dining session to the database session and attempt to commit the changes.
    db.add(dining_session)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Table already has an active session",
        ) from exc

    db.refresh(dining_session)

    return dining_session