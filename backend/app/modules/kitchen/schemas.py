# Pydantic schemas for the Kitchen module. These define the exact shape of
# JSON that goes in and out of the kitchen endpoints

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


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
