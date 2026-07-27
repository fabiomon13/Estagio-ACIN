from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.dining_session import DiningSession
from app.models.restaurant_table import RestaurantTable
from app.models.service_request import ServiceRequest
from app.models.service_request_status import ServiceRequestStatus
from app.models.service_request_type import ServiceRequestType


DEFAULT_TABLE_NUMBER = 1
DEFAULT_STATUS_ALIAS = "pending"


def seed_service_requests() -> None:
    """Cria um pedido pendente de cada tipo para a sessão ativa da mesa 1."""
    with SessionLocal() as session:
        restaurant_table = session.scalar(
            select(RestaurantTable).where(
                RestaurantTable.table_number == DEFAULT_TABLE_NUMBER
            )
        )
        if restaurant_table is None:
            raise RuntimeError(
                f"Mesa {DEFAULT_TABLE_NUMBER} não encontrada. "
                "Corre o seeder restaurant_tables primeiro."
            )

        dining_session = session.scalar(
            select(DiningSession).where(
                DiningSession.table_id == restaurant_table.id,
                DiningSession.is_active.is_(True),
            )
        )
        if dining_session is None:
            raise RuntimeError(
                f"A mesa {DEFAULT_TABLE_NUMBER} não tem uma sessão ativa. "
                "Corre o seeder dining_sessions primeiro."
            )

        pending_status = session.scalar(
            select(ServiceRequestStatus).where(
                ServiceRequestStatus.alias == DEFAULT_STATUS_ALIAS
            )
        )
        if pending_status is None:
            raise RuntimeError(
                f"Estado '{DEFAULT_STATUS_ALIAS}' não encontrado. "
                "Corre o seeder service_request_statuses primeiro."
            )

        request_types = session.scalars(
            select(ServiceRequestType).order_by(ServiceRequestType.id)
        ).all()
        if not request_types:
            raise RuntimeError(
                "Não existem tipos de pedido. "
                "Corre o seeder service_request_types primeiro."
            )

        existing_type_ids = set(
            session.scalars(
                select(ServiceRequest.type_id).where(
                    ServiceRequest.session_id == dining_session.id,
                )
            ).all()
        )

        new_requests = [
            ServiceRequest(
                session_id=dining_session.id,
                status_id=pending_status.id,
                type_id=request_type.id,
            )
            for request_type in request_types
            if request_type.id not in existing_type_ids
        ]

        session.add_all(new_requests)
        session.commit()

        print(
            f"{len(new_requests)} pedidos de assistência adicionados "
            f"à mesa {DEFAULT_TABLE_NUMBER}."
        )


if __name__ == "__main__":
    seed_service_requests()
