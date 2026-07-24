#backend/app/models/service_request.py

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class ServiceRequest(Base):
    __tablename__ = "service_requests"

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

    status_id = Column(
        Integer,
        ForeignKey(
            "service_requests_statuses.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    type = Column(
        String(50),
        nullable=False,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="normal",
        server_default="normal",
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

    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    dining_session = relationship(
        "DiningSession",
        back_populates="service_requests",
    )

    status = relationship(
        "ServiceRequestStatus",
        back_populates="service_requests",
    )