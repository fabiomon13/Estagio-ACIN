#backend/app/db/service_request_statuses.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.service_request_status import ServiceRequestStatus


DEFAULT_SERVICE_REQUEST_STATUSES = [
    ("Pending", "pending"),
    ("In Progress", "in-progress"),
    ("Resolved", "resolved"),
    ("Cancelled", "cancelled"),
]


def seed_service_request_statuses() -> None:
    """Insere os estados de pedido de serviço que ainda não existem."""
    status_names = [
        status_name
        for status_name, _status_alias in DEFAULT_SERVICE_REQUEST_STATUSES
    ]

    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(ServiceRequestStatus.name).where(
                    ServiceRequestStatus.name.in_(status_names)
                )
            ).all()
        )

        new_service_request_statuses = [
            ServiceRequestStatus(
                name=status_name,
                alias=status_alias,
            )
            for status_name, status_alias in DEFAULT_SERVICE_REQUEST_STATUSES
            if status_name not in existing_names
        ]

        session.add_all(new_service_request_statuses)
        session.commit()

        print(f"{len(new_service_request_statuses)} estados de solicitação de serviço adicionados.")


if __name__ == "__main__":
    seed_service_request_statuses()
