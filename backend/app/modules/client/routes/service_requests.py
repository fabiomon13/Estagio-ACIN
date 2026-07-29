# backend/app/modules/client/routes/service_requests.py
    
# Create service request endpoint
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.service_request import ServiceRequest
from app.models.service_request_status import ServiceRequestStatus
from app.models.service_request_type import ServiceRequestType
from app.modules.client.dependencies import CurrentGuest, DbSession
from app.modules.client.schemas import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestTypeResponse,
)

router = APIRouter(
    tags=["Client - Service Requests"],
)

def require_request_status(
    db: Session,
    alias: str,
) -> ServiceRequestStatus:
    request_status = db.scalar(
        select(ServiceRequestStatus).where(
            ServiceRequestStatus.alias == alias,
        )
    )

    if request_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status '{alias}' not configured for service requests",
        )

    return request_status


def require_service_request(
    db: Session,
    request_id: int,
) -> ServiceRequest:
    service_request = db.scalar(
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.request_type),
            selectinload(ServiceRequest.status),
        )
        .where(ServiceRequest.id == request_id)
    )

    if service_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido de assistência não encontrado",
        )

    return service_request


def require_pending_service_request(
    db: Session,
    request_id: int,
    session_id: int,
    *,
    lock: bool = False,
) -> ServiceRequest:
    query = (
        select(ServiceRequest)
        .options(selectinload(ServiceRequest.status))
        .where(
            ServiceRequest.id == request_id,
            ServiceRequest.session_id == session_id,
        )
    )

    if lock:
        query = query.with_for_update()

    service_request = db.scalar(query)

    if service_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido de assistência não encontrado",
        )

    if service_request.status.alias != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Apenas pedidos pendentes podem ser cancelados",
        )

    return service_request

@router.post(
    "/tables/{table_code}/service-requests",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_service_request(
    request_data: ServiceRequestCreate,
    guest: CurrentGuest,
    db: DbSession,
) -> ServiceRequest:
    pending_status = require_request_status(db, "pending")

    request_type = db.scalar(
        select(ServiceRequestType).where(
            ServiceRequestType.alias == request_data.type_alias,
        )
    )

    if request_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Type of service request not found",
        )

    existing_request_id = db.scalar(
        select(ServiceRequest.id).where(
            ServiceRequest.session_id == guest.session_id,
            ServiceRequest.type_id == request_type.id,
            ServiceRequest.resolved_at.is_(None),
        )
    )

    if existing_request_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="There is already an open request of this type",
        )

    service_request = ServiceRequest(
        session_id=guest.session_id,
        status_id=pending_status.id,
        type_id=request_type.id,
    )

    db.add(service_request)

    try:
        db.commit()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="It was not possible to create the service request",
        ) from exc

    return require_service_request(db, service_request.id)

# Get service requests for a specific table endpoint
@router.get(
    "/tables/{table_code}/service-requests",
    response_model=list[ServiceRequestResponse]
)
def get_service_requests(
    table_code: str,
    guest: CurrentGuest,
    db: DbSession
) -> list[ServiceRequest]:

    # Retrieve all service requests for the guest's session, including their request type and status, ordered by creation date in descending order
    return list(
        db.scalars(
            select(ServiceRequest)
            .options(
                selectinload(ServiceRequest.request_type),
                selectinload(ServiceRequest.status),
            )
            .where(
                ServiceRequest.session_id == guest.session_id,
            )
            .order_by(ServiceRequest.created_at.desc())
        ).all()
    )

# Get service request types endpoint
@router.get(
    "/service-request-types",
    response_model=list[ServiceRequestTypeResponse],
)
def get_service_request_types(
    db: DbSession,
) -> list[ServiceRequestType]:
    # Fetch all service request types from the database, ordered by name, and return them as a list.
    return list(
        db.scalars(
            select(ServiceRequestType).order_by(ServiceRequestType.name)
        ).all()
    )

# Cancel service request endpoint
@router.patch(
    "/tables/{table_code}/service-requests/{request_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
def cancel_service_request(
    request_id: int,
    guest: CurrentGuest,
    db: DbSession,
) -> None:
    service_request = require_pending_service_request(
        db=db,
        request_id=request_id,
        session_id=guest.session_id,
        lock=True,
    )

    cancelled_status = require_request_status(
        db,
        "cancelled",
    )

    service_request.status_id = cancelled_status.id
    service_request.resolved_at = datetime.now(timezone.utc)
    db.commit()
