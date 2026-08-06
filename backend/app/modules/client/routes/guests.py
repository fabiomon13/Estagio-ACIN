# backend/app/modules/client/routes/guests.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.buffet import Buffet
from app.models.guest import Guest
from app.models.order import Order
from app.models.tag import Tag
from app.modules.client.dependencies import (
    CurrentGuest,
    CurrentTable,
    DbSession,
    find_active_session,
)
from app.modules.client.schemas import (
    GuestBuffetUpdate,
    GuestAllergyPreferencesUpdate,
    GuestCreate,
    GuestResponse,
)
from app.modules.client.security import (
    hash_device_token,
    hash_legacy_device_token,
)


router = APIRouter(
    tags=["Client - Guests"],
)

def find_buffet(
    db: Session,
    buffet_id: int | None,
) -> Buffet | None:
    if buffet_id is None:
        return None

    buffet = db.get(Buffet, buffet_id)

    if buffet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet not found",
        )

    return buffet

# Create guest endpoint
@router.post(
    "/tables/{table_code}/guests",
    response_model=GuestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest(
    guest_data: GuestCreate,
    table: CurrentTable,
    db: DbSession,
) -> Guest:
    dining_session = find_active_session(
        table_id=table.id,
        db=db,
        lock=True,
    )

    if (
        not dining_session.is_approved
        or dining_session.waiter_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session has not been approved yet",
        )

    buffet = find_buffet(db, guest_data.buffet_id)
    current_hash = hash_device_token(guest_data.device_token)
    legacy_hash = hash_legacy_device_token(guest_data.device_token)

    existing_guest_id = db.scalar(
        select(Guest.id).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash.in_(
                (current_hash, legacy_hash)
            ),
        )
    )

    if existing_guest_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This device is already associated with the session",
        )

    guest_count = db.scalar(
        select(func.count(Guest.id)).where(
            Guest.session_id == dining_session.id,
        )
    ) or 0

    if guest_count >= dining_session.num_clients:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session has reached the maximum number of clients",
        )

    guest = Guest(
        session_id=dining_session.id,
        buffet_id=buffet.id if buffet else None,
        device_token_hash=current_hash,
    )

    db.add(guest)

    try:
        db.commit()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="It was not possible to add the guest to the session",
        ) from exc

    db.refresh(guest)
    return guest

# Get current guest endpoint
@router.get(
    "/tables/{table_code}/guests/me",
    response_model=GuestResponse,
)
def get_current_guest(
    guest: CurrentGuest,
) -> Guest:
    return guest

@router.put(
    "/tables/{table_code}/guests/me/allergy-preferences",
    response_model=GuestResponse,
)
def update_current_guest_allergy_preferences(
    preferences: GuestAllergyPreferencesUpdate,
    guest: CurrentGuest,
    db: DbSession,
) -> Guest:
    requested_ids = set(preferences.allergy_tag_ids)
    tags = list(db.scalars(select(Tag).where(Tag.id.in_(requested_ids))).all()) if requested_ids else []

    if len(tags) != len(requested_ids) or any(
        not tag.alias.startswith("alergenio-") for tag in tags
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only valid allergen tags can be selected",
        )

    guest.allergy_tags = tags
    guest.allergy_preferences_completed_at = datetime.now(UTC)
    db.commit()
    db.refresh(guest)
    return guest

# Update current guest buffet endpoint
@router.patch(
    "/tables/{table_code}/guests/me/buffet",
    response_model=GuestResponse,
)
def update_current_guest_buffet(
    table_code: str,
    guest_data: GuestBuffetUpdate,
    guest: CurrentGuest,
    db: DbSession,
) -> Guest:
    locked_guest = db.scalar(
        select(Guest)
        .where(Guest.id == guest.id)
        .with_for_update()
    )

    if locked_guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest not found",
        )

    existing_order = db.scalar(
        select(Order.id)
        .where(Order.guest_id == locked_guest.id)
        .limit(1)
    )

    if existing_order is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "It is not possible to change the buffet "
                "after the first order has been placed"
            ),
        )

    buffet = find_buffet(db, guest_data.buffet_id)

    if (
        guest_data.buffet_id is not None
        and buffet is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet not found",
        )

    locked_guest.buffet_id = buffet.id if buffet else None

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="It was not possible to change the buffet",
        ) from exc

    db.refresh(locked_guest)

    return locked_guest
