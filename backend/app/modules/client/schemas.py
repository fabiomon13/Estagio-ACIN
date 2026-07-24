#backend/app/modules/client/schemas.py

from datetime import datetime
from decimal import Decimal

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
    is_active: bool
    is_approved: bool
    approved_at: datetime | None

class GuestCreate(BaseModel):
    buffet_id: int | None = None
    device_token: str = Field(min_length=32)


class GuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    buffet_id: int | None


class BuffetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: Decimal
    waste_charge: Decimal

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    station_id: int
    name: str
    description: str | None
    base_price: Decimal
    base_preparation_time: int


class OrderItemCreate(BaseModel):
    item_id: int
    quantity: int = Field(ge=1)
    notes: str | None = None


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    status_id: int
    quantity: int
    notes: str | None
    unit_price_at_order: Decimal


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    guest_id: int
    round_number: int
    created_at: datetime
    items: list[OrderItemResponse]


class ServiceRequestCreate(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    priority: str = Field(default="normal", pattern="^(low|normal|high)$")


class ServiceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    status_id: int
    type: str
    priority: str
    created_at: datetime
    resolved_at: datetime | None


class BillResponse(BaseModel):
    session_id: int
    buffet_total: Decimal
    extras_total: Decimal
    total: Decimal
    is_paid: bool