#backend/app/models/guest.py

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    func,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(
        Integer,
        primary_key=True,
    )

    session_id = Column(
        Integer,
        ForeignKey(
            "dining_sessions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    buffet_id = Column(
        Integer,
        ForeignKey(
            "buffets.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    device_token_hash = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    dining_session = relationship(
        "DiningSession",
        back_populates="guests",
    )

    buffet = relationship(
        "Buffet",
        back_populates="guests",
    )

    orders = relationship(
        "Order",
        back_populates="guest",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_guests_session_device_token",
            "session_id",
            "device_token_hash",
            unique=True,
        ),
    )
