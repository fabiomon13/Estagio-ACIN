#backend/app/models/menu_item.py

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
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

    name = Column(String(150), nullable=False, unique=True, index=True)
    alias = Column(String(150), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    base_price = Column(Numeric(10, 2), nullable=False)
    base_preparation_time = Column(Integer, nullable=False)

    is_available = Column(
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

    category = relationship("Category", back_populates="menu_items")
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

    @property
    def tags(self):
        return [tag_link.tag for tag_link in self.tag_links]
