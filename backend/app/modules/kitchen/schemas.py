# Pydantic schemas for the Kitchen module. These define the exact shape of
# JSON that goes in and out of the kitchen endpoints

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class KitchenOrderItemOut(BaseModel):
    """One item inside a ticket, as returned by GET /kitchen/tickets and by
    PATCH /kitchen/order-items/{id}/status (the updated item)."""

    order_item_id: int
    menu_item_name: str
    quantity: int
    notes: str | None 
    tags: list[str]
    station_id: int
    station: str
    status: str
    created_at: datetime


class KitchenTicketOut(BaseModel):
    """One ticket = one round ordered by one guest. Returned by GET /kitchen/tickets."""

    order_id: int
    table_number: int
    guest_number: int  # 1st guest to join the table's session = 1, 2nd = 2, etc. (derived, not stored)
    round_number: int
    created_at: datetime
    items: list[KitchenOrderItemOut]  # always ALL items of the order, regardless of their status


class KitchenStatusUpdateRequest(BaseModel):
    """Body of PATCH /kitchen/order-items/{id}/status. Restricting `status`
    to these two literal values means FastAPI/Pydantic auto-rejects any
    other value with 422, before our own business logic even runs -- kitchen
    only ever moves an item forward through Preparing/Ready, never to
    Served (waiter's job) or Cancelled (client/waiter's job)."""

    status: Literal["Preparing", "Ready"]


class KitchenHistoryBaseFilters(BaseModel):
    """Shared filters for both /history and /history/summary. No `status`
    here on purpose -- the summary endpoint reuses this base directly,
    /history's own filters add `status` (and pagination) on top."""

    date_from: date
    date_to: date | None = None
    table_number: int | None = None
    item_id: int | None = None
    station_id: int | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "KitchenHistoryBaseFilters":
        if self.date_to is not None and self.date_to < self.date_from:
            raise ValueError("date_to não pode ser anterior a date_from")
        return self


class KitchenHistoryFilters(KitchenHistoryBaseFilters):
    status: str | None = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class KitchenHistoryItemOut(BaseModel):
    order_item_id: int
    menu_item_name: str
    table_number: int
    round_number: int
    quantity: int
    station_id: int
    station: str
    status: str
    created_at: datetime
    updated_at: datetime


class KitchenHistoryListOut(BaseModel):
    items: list[KitchenHistoryItemOut]
    total_count: int


class KitchenHistorySummaryOut(BaseModel):
    counts: dict[str, int]
    busiest_station: str | None
    peak_hour: int | None  # 0-23, the hour with the most items (by updated_at)


class KitchenHistoryFilterOptionOut(BaseModel):
    id: int
    name: str


class KitchenHistoryFilterOptionsOut(BaseModel):
    items: list[KitchenHistoryFilterOptionOut]
    stations: list[KitchenHistoryFilterOptionOut]
