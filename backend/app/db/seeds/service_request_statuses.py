#backend/app/db/service_request_statuses.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.service_request_status import ServiceRequestStatus


DEFAULT_SERVICE_REQUEST_STATUSES = [
    "Pending",
    "In Progress",
    "Resolved",
    "Cancelled",
]


def seed_service_request_statuses() -> None:
    """Insere os estados de item de pedido predefinidos que ainda não existem."""
    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(ServiceRequestStatus.name).where(ServiceRequestStatus.name.in_(DEFAULT_SERVICE_REQUEST_STATUSES))
            ).all()
        )

        new_service_request_statuses = [
            ServiceRequestStatus(name=status_name)
            for status_name in DEFAULT_SERVICE_REQUEST_STATUSES
            if status_name not in existing_names
        ]

        session.add_all(new_service_request_statuses)
        session.commit()

        print(f"{len(new_service_request_statuses)} estados de solicitação de serviço adicionados.")

if __name__ == "__main__":
    seed_service_request_statuses()
