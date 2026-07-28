#backend/app/models/order.py

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint(
            "guest_id",
            "round_number",
            name="uq_orders_guest_round",
        ),
    )

    id = Column(Integer, primary_key=True)
    guest_id = Column(
        Integer,
        ForeignKey("guests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    round_number = Column(Integer, nullable=False)
    client_request_id = Column(
        String(36),
        nullable=False,
        unique=True,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    guest = relationship("Guest", back_populates="orders")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
