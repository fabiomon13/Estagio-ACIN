# app/models/payment.py

from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

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
        unique=True,
        index=True,
    )

    amount_paid = Column(
        Numeric(10, 2),
        nullable=False,
    )

    tip_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        server_default="0",
    )

    method = Column(
        String(30),
        nullable=False,
    )

    waste_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    dining_session = relationship(
        "DiningSession",
        back_populates="payment",
    )