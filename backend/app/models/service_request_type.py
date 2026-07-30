# backend/app/models/service_request_type.py

from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class ServiceRequestType(Base):
    __tablename__ = "service_request_types"

    id = Column(
        Integer,
        primary_key=True,
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

    is_high_priority = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    service_requests = relationship(
        "ServiceRequest",
        back_populates="request_type",
    )
