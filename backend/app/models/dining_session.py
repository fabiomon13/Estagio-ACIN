#backend/app/models/dining_session.py

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    func,
    text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class DiningSession(Base):
    __tablename__ = "dining_sessions"

    __table_args__ = (
        Index(
            "uq_dining_sessions_active_table",
            "table_id",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
    )

    table_id = Column(
        Integer,
        ForeignKey(
            "restaurant_tables.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    waiter_id = Column(
        Integer,
        ForeignKey(
            "staff.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    start_time = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    end_time = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    num_clients = Column(
        Integer,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    is_approved = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    restaurant_table = relationship(
        "RestaurantTable",
        back_populates="associated_dining_sessions",
    )

    waiter = relationship(
        "Staff",
        back_populates="associated_dining_sessions",
    )

    guests = relationship(
        "Guest",
        back_populates="dining_session",
        cascade="all, delete-orphan",
    )

    payment = relationship(
        "Payment",
        back_populates="dining_session",
        uselist=False,
        cascade="all, delete-orphan",
    )

    service_requests = relationship(
        "ServiceRequest",
        back_populates="dining_session",
        cascade="all, delete-orphan",
    )
