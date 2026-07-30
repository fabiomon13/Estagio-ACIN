#backend/app/models/buffet.py

from sqlalchemy import Column, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Buffet(Base):
    __tablename__ = "buffets"

    id = Column(Integer, primary_key=True)
    price = Column(Numeric(10, 2), nullable=False)
    name = Column(String(150), nullable=False, unique=True, index=True)
    alias = Column(String(150), nullable=False, unique=True, index=True)

    waste_charge = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        server_default="0",
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

    guests = relationship("Guest", back_populates="buffet")
    item_links = relationship(
        "BuffetItem",
        back_populates="buffet",
        cascade="all, delete-orphan",
    )
