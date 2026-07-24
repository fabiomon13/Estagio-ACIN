#backend/app/models/menu_item.py

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True)

    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    station_id = Column(
        Integer,
        ForeignKey("stations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name = Column(String(150), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    base_price = Column(Numeric(10, 2), nullable=False)
    base_preparation_time = Column(Integer, nullable=False)

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

    category = relationship("Category", back_populates="menu_items")
    station = relationship("Station", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")
    buffet_links = relationship(
        "BuffetItem",
        back_populates="menu_item",
        cascade="all, delete-orphan",
    )
    tag_links = relationship(
        "TagItem",
        back_populates="menu_item",
        cascade="all, delete-orphan",
    )
