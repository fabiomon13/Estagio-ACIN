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
from app.modules.client.dependencies import CurrentGuest
from app.modules.client.schemas import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestTypeResponse,
)

router = APIRouter(
    tags=["Client - Service Requests"],
)

@router.post(
    "/tables/{table_code}/service-requests",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_service_request(
    table_code: str,
    request_data: ServiceRequestCreate,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> ServiceRequest:
    # Find the "pending" status for service requests
    pending_status = db.scalar(
        select(ServiceRequestStatus).where(
            ServiceRequestStatus.alias == "pending",
        )
    )

    # Check if the "pending" status exists; if not, raise an HTTP exception
    if pending_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Estado Pending de assistência não configurado",
        )

    # Find the service request type based on the provided alias in the request data
    request_type = db.scalar(
        select(ServiceRequestType).where(
            ServiceRequestType.alias == request_data.type_alias,
        )
    )

    # Check if the service request type exists; if not, raise an HTTP exception
    if request_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tipo de pedido de assistência inválido",
        )

    # Check if there is an existing unresolved service request of the same type for the current guest's session
    existing_request = db.scalar(
        select(ServiceRequest).where(
            ServiceRequest.session_id == guest.session_id,
            ServiceRequest.type_id == request_type.id,
            ServiceRequest.resolved_at.is_(None),
        )
    )
    if existing_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um pedido deste tipo em aberto",
        )

    # Create a new service request with the current guest's session ID, the "pending" status ID, and the service request type ID
    service_request = ServiceRequest(
        session_id=guest.session_id,
        status_id=pending_status.id,
        type_id=request_type.id,
    )

    db.add(service_request)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível criar o pedido de assistência",
        ) from exc

    # Refresh the service request instance to get the latest data from the database
    created_request = db.scalar(
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.request_type),
            selectinload(ServiceRequest.status),
        )
        .where(ServiceRequest.id == service_request.id)
    )

    # Check if the created service request was successfully retrieved; if not, raise an HTTP exception
    if created_request is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível carregar o pedido de assistência",
        )

    return created_request

# Get service requests for a specific table endpoint
@router.get(
    "/tables/{table_code}/service-requests",
    response_model=list[ServiceRequestResponse]
)
def get_service_requests(
    table_code: str,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
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
    db: Annotated[Session, Depends(get_db)],
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
)
def cancel_service_request(
    table_code: str,
    request_id: int,
    guest: CurrentGuest,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    # Lock the service request
    service_request = db.scalar(
        select(ServiceRequest)
        .options(selectinload(ServiceRequest.status))
        .where(
            ServiceRequest.id == request_id,
            ServiceRequest.session_id == guest.session_id,
        )
        .with_for_update()
    )

    # Check if the service request exists
    if service_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    # Check if the service request is in a cancellable state
    if service_request.status.alias != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not allowed to cancel a service request that is not in a pending state.",
        )

    # Find the cancelled status
    canceled_status = db.scalar(
        select(ServiceRequestStatus).where(
            ServiceRequestStatus.alias == "cancelled",
        )
    )

    # Check if the cancelled status exists
    if canceled_status is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cancelled status not configured.",
        )

    # Update the service request status to cancelled and set the resolved_at timestamp
    service_request.status_id = canceled_status.id
    service_request.resolved_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="It was not possible to cancel the service request",
        ) from exc