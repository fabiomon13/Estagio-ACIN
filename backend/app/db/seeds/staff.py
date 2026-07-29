from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.staff import Staff
from app.models.staff_role import StaffRole

DEV_ADMIN_EMAIL = "admin@scanandserve.dev"
DEV_ADMIN_PASSWORD = "ChangeMe123!"

DEV_WAITERS = [
    {"name": "Waiter 1", "email": "waiter1@scanandserve.dev", "password": "ChangeMe123!"},
    {"name": "Waiter 2", "email": "waiter2@scanandserve.dev", "password": "ChangeMe123!"},
    {"name": "Waiter 3", "email": "waiter3@scanandserve.dev", "password": "ChangeMe123!"}
]

def seed_dev_admin() -> None:
    """Cria o Admin inicial de desenvolvimento, se ainda não existir."""
    with SessionLocal() as session:
        existing = session.scalar(select(Staff).where(Staff.email == DEV_ADMIN_EMAIL))
        if existing is not None:
            print("Admin de desenvolvimento já existe.")
            return

        admin_role = session.scalar(select(StaffRole).where(StaffRole.name == "Admin"))
        if admin_role is None:
            raise RuntimeError("Staff role 'Admin' não encontrado. Corre seed_staff_roles primeiro.")

        admin = Staff(
            staff_role_id=admin_role.id,
            name="Dev Admin",
            email=DEV_ADMIN_EMAIL,
            password_hash=hash_password(DEV_ADMIN_PASSWORD),
            is_active=True,
        )
        session.add(admin)
        session.commit()

        print(f"Admin de desenvolvimento criado: {DEV_ADMIN_EMAIL}")


def seed_dev_waiters() -> None:

    """Cria os Waiters iniciais de desenvolvimento, se ainda não existirem."""

    with SessionLocal() as session:
        waiter_role = session.scalar(select(StaffRole).where((func.lower(StaffRole.alias) == "waiter")))
        if waiter_role is None:
            raise RuntimeError("Staff role 'Waiter' não encontrado. Corre seed_staff_roles primeiro.")

        created_waiters = 0

        for w in DEV_WAITERS:
            existing = session.scalar(select(Staff).where(Staff.email == w["email"]))
            if existing is not None:
                print(f"Waiter de desenvolvimento já existe: {w['email']}")
                continue

            waiter = Staff(
                staff_role_id=waiter_role.id,
                name=w["name"],
                email=w["email"],
                password_hash=hash_password(w["password"]),
                is_active=True,
            )
            session.add(waiter)
            print(f"Waiter de desenvolvimento criado: {w['email']}")
            created_waiters += 1

        session.commit()
        print(f"Total de waiters criados: {created_waiters}")

if __name__ == "__main__":
    seed_dev_admin()
    seed_dev_waiters()
