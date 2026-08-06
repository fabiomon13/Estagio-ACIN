#backend/app/models/guest.py

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    func,
    Integer,
    String,
    Table,
)
from sqlalchemy.orm import relationship

from app.db.base import Base

guest_allergy_tags = Table(
    "guest_allergy_tags",
    Base.metadata,
    Column("guest_id", ForeignKey("guests.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Guest(Base):
    __tablename__ = "guests"

    id = Column(
        Integer,
        primary_key=True,
    )

    session_id = Column(
        Integer,
        ForeignKey(
            "dining_sessions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    buffet_id = Column(
        Integer,
        ForeignKey(
            "buffets.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    device_token_hash = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    allergy_preferences_completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    dining_session = relationship(
        "DiningSession",
        back_populates="guests",
    )

    buffet = relationship(
        "Buffet",
        back_populates="guests",
    )

    orders = relationship(
        "Order",
        back_populates="guest",
        cascade="all, delete-orphan",
    )

    allergy_tags = relationship(
        "Tag",
        secondary=guest_allergy_tags,
        lazy="selectin",
    )

    @property
    def allergy_tag_ids(self) -> list[int]:
        return sorted(tag.id for tag in self.allergy_tags)

    __table_args__ = (
        Index(
            "ix_guests_session_device_token",
            "session_id",
            "device_token_hash",
            unique=True,
        ),
    )
