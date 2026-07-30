#backend/app/models/station.py

from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    alias = Column(String(100), nullable=False, unique=True, index=True)

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

    default_categories = relationship(
        "Category",
        back_populates="default_station",
        foreign_keys="Category.default_station_id",
    )

    menu_items = relationship(
        "MenuItem",
        back_populates="station",
        foreign_keys="MenuItem.station_id",
    )
