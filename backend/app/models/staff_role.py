#backend/app/models/staff_role.py

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class StaffRole(Base):
    __tablename__ = "staff_roles"

    id = Column(
        Integer,
        primary_key=True,
    )

    name = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    alias = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    staff_members = relationship(
        "Staff",
        back_populates="staff_role",
    )