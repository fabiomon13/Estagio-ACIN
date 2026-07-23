#backend/app/models/tag_item.py

from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.base import Base


class TagItem(Base):
    __tablename__ = "tag_items"

    item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id = Column(
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    menu_item = relationship("MenuItem", back_populates="tag_links")
    tag = relationship("Tag", back_populates="item_links")
