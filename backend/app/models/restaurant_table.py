# app/models/restaurant_table.py

from uuid import uuid4

from sqlalchemy import Column, DateTime, Integer, String, func, text
from sqlalchemy.orm import relationship

from app.db.base import Base


class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"

    id = Column(
        Integer,
        primary_key=True,
    )

    table_number = Column(
        Integer,
        nullable=False,
        unique=True,
        index=True,
    )

    max_capacity = Column(
        Integer,
        nullable=False,
    )

    public_code = Column(
        String(36),
        nullable=False,
        unique=True,
        index=True,
        default=lambda: str(uuid4()),
        server_default=text("(gen_random_uuid())::text"),
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

    associated_dining_sessions = relationship(
        "DiningSession",
        back_populates="restaurant_table",
    )
