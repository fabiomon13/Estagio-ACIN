#backend/app/db/seeds/dining_sessions.py

from datetime import datetime, timezone

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.dining_session import DiningSession
from app.models.restaurant_table import RestaurantTable
from app.models.staff import Staff
from app.models.staff_role import StaffRole


DEFAULT_TABLE_NUMBER = 1
DEFAULT_NUM_CLIENTS = 2


def seed_dining_session() -> None:
    """Cria uma sessão ativa, aprovada e com waiter atribuído para a mesa 1.

    Se a sessão já existir mas ainda não tiver sido aprovada/atribuída a um
    waiter (ex.: criada antes desta correção), aprova-a agora em vez de a
    ignorar -- caso contrário nenhum waiter conseguiria interagir com ela
    (ver `_ensure_session_owner_or_admin` em `staff_service.py`).
    """
    with SessionLocal() as session:
        restaurant_table = session.scalar(
            select(RestaurantTable).where(
                RestaurantTable.table_number == DEFAULT_TABLE_NUMBER
            )
        )

        if restaurant_table is None:
            raise RuntimeError(
                f"The table {DEFAULT_TABLE_NUMBER} was not found. "
                "Run the restaurant_tables seeder first."
            )

        if DEFAULT_NUM_CLIENTS > restaurant_table.max_capacity:
            raise RuntimeError(
                f"The number of clients ({DEFAULT_NUM_CLIENTS}) exceeds the table's capacity ({restaurant_table.max_capacity})."
            )

        waiter = session.scalar(
            select(Staff)
            .join(StaffRole, Staff.staff_role_id == StaffRole.id)
            .where(func.lower(StaffRole.alias) == "waiter")
            .order_by(Staff.id)
        )
        if waiter is None:
            raise RuntimeError(
                "No waiter staff found. Run the staff seeder first."
            )

        existing_session = session.scalar(
            select(DiningSession).where(
                DiningSession.table_id == restaurant_table.id,
                DiningSession.is_active.is_(True),
            )
        )

        if existing_session is not None:
            if not existing_session.is_approved or existing_session.waiter_id is None:
                existing_session.is_approved = True
                existing_session.approved_at = existing_session.approved_at or datetime.now(timezone.utc)
                existing_session.waiter_id = existing_session.waiter_id or waiter.id
                session.commit()
                print(
                    f"The table {DEFAULT_TABLE_NUMBER}'s session was approved "
                    f"and assigned to {waiter.name}."
                )
            else:
                print(f"The table {DEFAULT_TABLE_NUMBER} already has an active, approved session.")
            return

        dining_session = DiningSession(
            table_id=restaurant_table.id,
            num_clients=DEFAULT_NUM_CLIENTS,
            is_active=True,
            is_approved=True,
            approved_at=datetime.now(timezone.utc),
            waiter_id=waiter.id,
        )

        session.add(dining_session)
        session.commit()

        print(
            f"Session created for table {DEFAULT_TABLE_NUMBER} "
            f"with {DEFAULT_NUM_CLIENTS} clients, approved and assigned to {waiter.name}."
        )


if __name__ == "__main__":
    seed_dining_session()
