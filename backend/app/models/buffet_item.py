#backend/app/models/buffet_item.py

from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.base import Base


class BuffetItem(Base):
    __tablename__ = "buffet_items"

    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    
    buffet_id = Column(
        Integer,
        ForeignKey("buffets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    menu_item = relationship("MenuItem", back_populates="buffet_links")
    buffet = relationship("Buffet", back_populates="item_links")
