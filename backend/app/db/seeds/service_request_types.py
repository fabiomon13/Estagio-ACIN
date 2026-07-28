#backend/app/db/seeds/service_request_types.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.service_request_type import ServiceRequestType


DEFAULT_SERVICE_REQUEST_TYPES = [
    ("Assistance", "assistance", False),
    ("Payment Request", "payment_request", True),
]


def seed_service_request_types() -> None:
    """Cria os tipos predefinidos de pedidos de assistência."""
    type_aliases = [
        request_alias
        for _name, request_alias, _is_high_priority in DEFAULT_SERVICE_REQUEST_TYPES
    ]

    with SessionLocal() as session:
        existing_types = session.scalars(
            select(ServiceRequestType).where(
                ServiceRequestType.alias.in_(type_aliases)
            )
        ).all()
        types_by_alias = {
            request_type.alias: request_type
            for request_type in existing_types
        }

        created_types = 0
        updated_types = 0

        for name, request_alias, is_high_priority in DEFAULT_SERVICE_REQUEST_TYPES:
            existing_type = types_by_alias.get(request_alias)

            if existing_type is not None:
                if existing_type.is_high_priority != is_high_priority:
                    existing_type.is_high_priority = is_high_priority
                    updated_types += 1
                continue

            session.add(
                ServiceRequestType(
                    name=name,
                    alias=request_alias,
                    is_high_priority=is_high_priority,
                )
            )
            created_types += 1

        session.commit()

        print(f"{created_types} tipos de pedido adicionados.")
        print(f"{updated_types} tipos de pedido atualizados.")


if __name__ == "__main__":
    seed_service_request_types()
