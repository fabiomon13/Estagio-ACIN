#backend/app/models/staff.py

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(
        Integer,
        primary_key=True,
    )

    staff_role_id = Column(
        Integer,
        ForeignKey(
            "staff_roles.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    photo_url = Column(
        String(500),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    staff_role = relationship(
        "StaffRole",
        back_populates="staff_members",
    )

    associated_dining_sessions = relationship(
        "DiningSession",
        back_populates="waiter",
    )
