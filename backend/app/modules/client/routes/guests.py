# backend/app/modules/client/routes/guests.py

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.buffet import Buffet
from app.models.guest import Guest
from app.models.order import Order
from app.modules.client.dependencies import (
    CurrentGuest,
    find_active_session,
    find_table,
)
from app.modules.client.schemas import (
    GuestBuffetUpdate,
    GuestCreate,
    GuestResponse,
)
from app.modules.client.security import hash_device_token


router = APIRouter(
    tags=["Client - Guests"],
)

# Create guest endpoint
@router.post(
    "/tables/{table_code}/guests",
    response_model=GuestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest(
    table_code: str,
    guest_data: GuestCreate,
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    table = find_table(table_code, db)

    dining_session = find_active_session(
        table_id=table.id,
        db=db,
        lock=True,
    )

    if not dining_session.is_approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sessão ainda não foi aprovada",
        )

    buffet = (
        db.get(Buffet, guest_data.buffet_id)
        if guest_data.buffet_id is not None
        else None
    )

    if (
        guest_data.buffet_id is not None
        and buffet is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet não encontrado",
        )

    token_hash = hash_device_token(
        guest_data.device_token,
    )

    existing_guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        )
    )

    if existing_guest is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este dispositivo já pertence à sessão",
        )

    guest_count = db.scalar(
        select(func.count(Guest.id)).where(
            Guest.session_id == dining_session.id,
        )
    ) or 0

    if guest_count >= dining_session.num_clients:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A sessão já atingiu o número máximo "
                "de clientes"
            ),
        )

    guest = Guest(
        session_id=dining_session.id,
        buffet_id=(
            buffet.id
            if buffet is not None
            else None
        ),
        device_token_hash=token_hash,
    )

    db.add(guest)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Não foi possível adicionar "
                "o cliente à sessão"
            ),
        ) from exc

    db.refresh(guest)

    return guest

# Get current guest endpoint
@router.get(
    "/tables/{table_code}/guests/me",
    response_model=GuestResponse,
)
def get_current_guest(
    table_code: str,
    guest: CurrentGuest,
) -> Guest:
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
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    locked_guest = db.scalar(
        select(Guest)
        .where(Guest.id == guest.id)
        .with_for_update()
    )

    if locked_guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado",
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
                "Não é possível alterar o buffet "
                "depois do primeiro pedido"
            ),
        )

    buffet = (
        db.get(Buffet, guest_data.buffet_id)
        if guest_data.buffet_id is not None
        else None
    )

    if (
        guest_data.buffet_id is not None
        and buffet is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet não encontrado",
        )

    locked_guest.buffet_id = (
        buffet.id
        if buffet is not None
        else None
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível alterar o buffet",
        ) from exc

    db.refresh(locked_guest)

    return locked_guest