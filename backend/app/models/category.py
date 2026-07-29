#backend/app/models/category.py

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(
        Integer,
        primary_key=True,
    )

    default_station_id = Column(
        Integer,
        ForeignKey(
            "stations.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    alias = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
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

    default_station = relationship(
        "Station",
        back_populates="default_categories",
        foreign_keys=[default_station_id],
    )

    menu_items = relationship(
        "MenuItem",
        back_populates="category",
    )
