#backend/app/modules/client/schemas.py

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_number: int
    max_capacity: int
    public_code: str


class SessionCreate(BaseModel):
    num_clients: int = Field(
        ge=1,
        description="Number of clients at the table",
    )


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_id: int
    waiter_id: int | None
    start_time: datetime
    end_time: datetime | None
    num_clients: int
    guest_count: int
    available_places: int
    is_active: bool
    is_approved: bool
    approved_at: datetime | None


class GuestCreate(BaseModel):
    buffet_id: int | None = Field(default=None, gt=0)
    device_token: str = Field(min_length=32, max_length=128)


class GuestBuffetUpdate(BaseModel):
    buffet_id: int | None = Field(default=None, gt=0)


class GuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    buffet_id: int | None


class BuffetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: str
    price: Decimal
    waste_charge: Decimal


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    default_station_id: int
    name: str
    alias: str


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    alias: str


class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    station_id: int | None
    name: str
    alias: str
    description: str | None
    photo_url: str | None
    base_price: Decimal
    base_preparation_time: int
    is_available: bool
    category: CategoryResponse
    tags: list[TagResponse]


class OrderItemCreate(BaseModel):
    item_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=20)
    notes: str | None = Field(default=None, max_length=500)


class OrderCreate(BaseModel):
    client_request_id: UUID
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderMenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: str
    photo_url: str | None


class StatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: str


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    status_id: int
    quantity: int
    notes: str | None
    unit_price_at_order: Decimal
    menu_item: OrderMenuItemResponse
    status: StatusResponse


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    guest_id: int
    round_number: int
    client_request_id: UUID
    created_at: datetime
    items: list[OrderItemResponse]


class ServiceRequestCreate(BaseModel):
    type: str = Field(min_length=1, max_length=100)


class ServiceRequestTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: str
    is_high_priority: bool


class ServiceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    status_id: int
    type_id: int
    type: str
    is_high_priority: bool
    request_type: ServiceRequestTypeResponse
    status: StatusResponse
    created_at: datetime
    resolved_at: datetime | None


class BillResponse(BaseModel):
    session_id: int
    buffet_total: Decimal
    extras_total: Decimal
    waste_total: Decimal
    tip_amount: Decimal
    total: Decimal
    is_paid: bool
    paid_at: datetime | None

# Class to handle tip updates with validation for non-negative values and specific decimal precision
class TipUpdate(BaseModel):
    tip_amount: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
