from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.roles import StaffRoleEnum
from app.db.dependencies import get_db
from app.modules.kitchen import service
from app.modules.kitchen.schemas import (
    KitchenHistoryBaseFilters,
    KitchenHistoryFilterOptionsOut,
    KitchenHistoryFilters,
    KitchenHistoryListOut,
    KitchenHistorySummaryOut,
    KitchenOrderItemOut,
    KitchenStatusUpdateRequest,
    KitchenTicketOut,
)

# Protect all kitchen routes. Admin access is handled by require_role().
router = APIRouter(
    prefix="/kitchen",
    tags=["Kitchen"],
    dependencies=[Depends(require_role(StaffRoleEnum.CHEF))],
)


@router.get("/tickets", response_model=list[KitchenTicketOut])
def get_tickets(db: Session = Depends(get_db)) -> list[KitchenTicketOut]:
    return service.get_active_tickets(db)


@router.patch("/order-items/{order_item_id}/status", response_model=KitchenOrderItemOut)
def update_order_item_status(
    order_item_id: int,
    payload: KitchenStatusUpdateRequest,  # FastAPI validates the JSON body against this automatically
    db: Session = Depends(get_db),
) -> KitchenOrderItemOut:
    return service.update_item_status(db, order_item_id, payload.status)


KitchenHistoryQuery = Annotated[KitchenHistoryFilters, Depends()]


@router.get("/history", response_model=KitchenHistoryListOut)
def get_history(filters: KitchenHistoryQuery, db: Session = Depends(get_db)) -> KitchenHistoryListOut:
    return service.get_history_items(db, filters)


KitchenHistorySummaryQuery = Annotated[KitchenHistoryBaseFilters, Depends()]


@router.get("/history/summary", response_model=KitchenHistorySummaryOut)
def get_history_summary(
    filters: KitchenHistorySummaryQuery, db: Session = Depends(get_db)
) -> KitchenHistorySummaryOut:
    return service.get_history_summary(db, filters)


@router.get("/history/filters", response_model=KitchenHistoryFilterOptionsOut)
def get_history_filter_options(db: Session = Depends(get_db)) -> KitchenHistoryFilterOptionsOut:
    return service.get_history_filter_options(db)
