import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.websocket_manager import connection_manager
from app.models.dining_session import DiningSession
from app.models.staff import Staff
from app.models.staff_role import StaffRole

STAFF_TOPIC_PREFIX = "staff"

logger = logging.getLogger(__name__)


def broadcast_staff_dashboard(db: Session, session_id: int | None = None) -> None:
    """Notify only staff who need an immediate dashboard refresh."""
    try:
        admin_ids = {
            staff_id
            for (staff_id,) in (
                db.query(Staff.id)
                .join(Staff.staff_role)
                .filter(
                    Staff.is_active.is_(True),
                    func.lower(StaffRole.alias) == "admin",
                )
                .all()
            )
        }

        if session_id is None:
            recipient_ids = admin_ids | {
                staff_id
                for (staff_id,) in (
                    db.query(Staff.id)
                    .join(Staff.staff_role)
                    .filter(
                        Staff.is_active.is_(True),
                        func.lower(StaffRole.alias) == "waiter",
                    )
                    .all()
                )
            }
        else:
            waiter_id = (
                db.query(DiningSession.waiter_id)
                .filter(DiningSession.id == session_id)
                .scalar()
            )

            recipient_ids = admin_ids

            if waiter_id is not None:
                recipient_ids.add(waiter_id)

        for staff_id in recipient_ids:
            connection_manager.broadcast(
                f"{STAFF_TOPIC_PREFIX}:{staff_id}",
                {"type": "dashboard.changed"},
            )
    except Exception:
        logger.exception("broadcast_staff_dashboard failed after a successful commit")