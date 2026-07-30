#backend/app/db/staff_roles.py

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.staff_role import StaffRole


DEFAULT_STAFF_ROLES = [
    ("Admin", "admin"),
    ("Waiter", "waiter"),
    ("Chef", "chef"),
]


def seed_staff_roles() -> None:
    """Insere os papéis de staff predefinidos que ainda não existem."""
    role_names = [
        role_name
        for role_name, _role_alias in DEFAULT_STAFF_ROLES
    ]

    with SessionLocal() as session:
        existing_names = set(
            session.scalars(
                select(StaffRole.name).where(
                    StaffRole.name.in_(role_names)
                )
            ).all()
        )

        new_staff_roles = [
            StaffRole(
                name=role_name,
                alias=role_alias,
            )
            for role_name, role_alias in DEFAULT_STAFF_ROLES
            if role_name not in existing_names
        ]

        session.add_all(new_staff_roles)
        session.commit()

        print(f"{len(new_staff_roles)} papéis de staff adicionados.")


if __name__ == "__main__":
    seed_staff_roles()
