#backend/app/models/order_item_status.py

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class OrderItemStatus(Base):
    __tablename__ = "order_item_statuses"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True, index=True)

    order_items = relationship("OrderItem", back_populates="status")
