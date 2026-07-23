#backend/app/modules/client/router.py

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.dependencies import get_db

from app.models.buffet import Buffet
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.restaurant_table import RestaurantTable

from app.modules.client.security import hash_device_token
from app.modules.client.schemas import (
    GuestCreate,
    GuestResponse,
    SessionCreate,
    SessionResponse,
    TableResponse,
)


router = APIRouter()


def find_table(
    table_code: str,
    db: Session,
) -> RestaurantTable:
    table = db.scalar(
        select(RestaurantTable).where(
            RestaurantTable.public_code == table_code,
        ),
    )

    if table is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesa não encontrada",
        )

    return table


def find_active_session(
    table_id: int,
    db: Session,
) -> DiningSession:
    dining_session = db.scalar(
        select(DiningSession).where(
            DiningSession.table_id == table_id,
            DiningSession.is_active.is_(True),
        ),
    )

    if dining_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="A mesa não possui uma sessão ativa",
        )

    return dining_session


@router.get(
    "/tables/{table_code}",
    response_model=TableResponse,
)
def get_table(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> RestaurantTable:
    return find_table(table_code, db)


@router.get(
    "/tables/{table_code}/session",
    response_model=SessionResponse,
)
def get_active_session(
    table_code: str,
    db: Annotated[Session, Depends(get_db)],
) -> DiningSession:
    table = find_table(table_code, db)

    return find_active_session(table.id, db)


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
    table = find_table(table_code, db)

    if session_data.num_clients > table.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O número de clientes ultrapassa a capacidade da mesa",
        )

    existing_session = db.scalar(
        select(DiningSession).where(
            DiningSession.table_id == table.id,
            DiningSession.is_active.is_(True),
        ),
    )

    if existing_session is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A mesa já possui uma sessão ativa",
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
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A mesa já possui uma sessão ativa",
        )

    db.refresh(dining_session)

    return dining_session


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
    dining_session = find_active_session(table.id, db)

    if not dining_session.is_approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sessão ainda não foi aprovada",
        )

    buffet = db.get(Buffet, guest_data.buffet_id)

    if buffet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buffet não encontrado",
        )

    token_hash = hash_device_token(guest_data.device_token)

    existing_guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        ),
    )

    if existing_guest is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este dispositivo já pertence à sessão",
        )

    guest = Guest(
        session_id=dining_session.id,
        buffet_id=buffet.id,
        device_token_hash=token_hash,
    )

    db.add(guest)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível adicionar o cliente à sessão",
        )

    db.refresh(guest)

    return guest


@router.get(
    "/tables/{table_code}/guests/me",
    response_model=GuestResponse,
)
def get_current_guest(
    table_code: str,
    device_token: Annotated[
        str,
        Header(alias="X-Device-Token"),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> Guest:
    table = find_table(table_code, db)
    dining_session = find_active_session(table.id, db)
    token_hash = hash_device_token(device_token)

    guest = db.scalar(
        select(Guest).where(
            Guest.session_id == dining_session.id,
            Guest.device_token_hash == token_hash,
        ),
    )

    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado nesta sessão",
        )

    return guest