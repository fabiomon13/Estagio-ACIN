from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.staff import Staff
from app.models.staff_role import StaffRole

DEV_ADMIN_EMAIL = "admin@scanandserve.dev"
DEV_ADMIN_PASSWORD = "ChangeMe123!"


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

        print(f"Admin de desenvolvimento criado: {DEV_ADMIN_EMAIL} / {DEV_ADMIN_PASSWORD}")


if __name__ == "__main__":
    seed_dev_admin()
