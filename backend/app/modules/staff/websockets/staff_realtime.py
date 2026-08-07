import logging

from sqlalchemy.orm import Session

from app.core.websocket_manager import connection_manager

STAFF_TOPIC = "staff"

logger = logging.getLogger(__name__)


def broadcast_staff_dashboard(db: Session) -> None:
    """Push a fresh dashboard snapshot after a successful relevant DB change."""
    try:
        # Local import prevents a circular import with staff_service.
        from app.modules.staff.staff_service import get_staff_dashboard

        dashboard = get_staff_dashboard(db)

        connection_manager.broadcast(
            STAFF_TOPIC,
            {
                "dashboard": dashboard.model_dump(mode="json"),
            },
        )
    except Exception:
        logger.exception("broadcast_staff_dashboard failed after a successful commit")