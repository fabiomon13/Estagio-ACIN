# app/models/restaurant_table.py

from sqlalchemy import Column, Integer
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

    associated_dining_sessions = relationship(
        "DiningSession",
        back_populates="restaurant_table",
    )