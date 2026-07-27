#backend/app/models/service_request_status.py

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class ServiceRequestStatus(Base):
    __tablename__ = "service_requests_statuses"

    id = Column(
        Integer,
        primary_key=True,
    )

    name = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    alias = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    service_requests = relationship(
        "ServiceRequest",
        back_populates="status",
    )
