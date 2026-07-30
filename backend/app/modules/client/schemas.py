#backend/app/modules/client/schemas.py

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Class for request schemas
# The RequestSchema class is a base model for request schemas, configured to forbid extra fields and strip whitespace from string fields.
class RequestSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

# Schema for response models
class ResponseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

# Schema for table response
# id, table_number, max_capacity: int greater than 0
# public_code: UUID
class TableResponse(ResponseSchema):
    id: int = Field(gt=0)
    table_number: int = Field(gt=0)
    max_capacity: int = Field(gt=0)
    public_code: UUID

# Schema for session creation request
# num_clients: int between 1 and 100
class SessionCreate(RequestSchema):
    num_clients: int = Field(
        ge=1,
        le=100,
        description="Number of clients at the table",
    )

# Schema for session response
# id, table_id: int (greater than 0)
# waiter_id: int (greater than 0) or None
# start_time: datetime
# end_time: datetime or None
# num_clients: int (greater than or equal to 1)
# guest_count, available_places: int (greater than or equal to 0)
# is_active, is_approved: bool
# approved_at: datetime or None
# The model validator checks for consistency between guest_count, num_clients, and available_places,
# as well as ensuring that approved sessions have a waiter and approval date, and that end_time does not precede start_time.
class SessionResponse(ResponseSchema):
    id: int = Field(gt=0)
    table_id: int = Field(gt=0)
    waiter_id: int | None = Field(default=None, gt=0)
    start_time: datetime
    end_time: datetime | None
    num_clients: int = Field(ge=1)
    guest_count: int = Field(ge=0)
    available_places: int = Field(ge=0)
    is_active: bool
    is_approved: bool
    approved_at: datetime | None

    @model_validator(mode="after")
    def validate_session_state(self) -> "SessionResponse":
        if self.guest_count > self.num_clients:
            raise ValueError(
                "Guest count cannot exceed the session capacity"
            )

        if self.available_places != (
            self.num_clients - self.guest_count
        ):
            raise ValueError(
                "Available places are inconsistent"
            )

        if self.is_approved:
            if self.waiter_id is None:
                raise ValueError(
                    "An approved session must have a waiter"
                )

            if self.approved_at is None:
                raise ValueError(
                    "An approved session must have an approval date"
                )

        if (
            self.end_time is not None
            and self.end_time < self.start_time
        ):
            raise ValueError(
                "End time cannot precede start time"
            )

        return self

# Schema for guest creation request
# buffet_id: int (greater than 0) or None
# device_token: str (min length 32, max length 128)
# The field validator normalizes the device_token by stripping whitespace.
class GuestCreate(RequestSchema):
    buffet_id: int | None = Field(default=None, gt=0)
    device_token: str = Field(min_length=32, max_length=128)

    @field_validator("device_token", mode="before")
    @classmethod
    def normalize_device_token(
        cls,
        value: object,
    ) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

# Schema for guest buffet update request
# buffet_id: int (greater than 0) or None
class GuestBuffetUpdate(RequestSchema):
    buffet_id: int | None = Field(
    default=None,
    gt=0,
    description="Null removes the buffet selection",
)

# Schema for guest response
# id, session_id, buffet_id: int (greater than 0)
# buffet_id can be None
class GuestResponse(ResponseSchema):
    id: int = Field(gt=0)
    session_id: int = Field(gt=0)
    buffet_id: int | None = Field(default=None, gt=0)

# Schema for buffet response
# id: int (greater than 0)
# name, alias: str (min length 1, max length 150)
# price, waste_charge: Decimal (greater than or equal to 0, max digits 10, decimal places 2)
class BuffetResponse(ResponseSchema):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    alias: str = Field(min_length=1, max_length=150)
    price: Decimal = Field(
        ge=0,
        max_digits=10,
        decimal_places=2,
    )
    waste_charge: Decimal = Field(
        ge=0,
        max_digits=10,
        decimal_places=2,
    )

# Schema for category response
# id, default_station_id: int (greater than 0)
# name, alias: str (min length 1, max length 150)
class CategoryResponse(ResponseSchema):
    id: int = Field(gt=0)
    default_station_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    alias: str = Field(min_length=1, max_length=150)

# Schema for tag response
# id: int (greater than 0)
# name, alias: str (min length 1, max length 100)
class TagResponse(ResponseSchema):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=100)
    alias: str = Field(min_length=1, max_length=100)

# Schema for menu item response
# id, category_id: int (greater than 0)
# name, alias: str (min length 1, max length 150)
# description, photo_url: str or None
# base_price: Decimal (greater than or equal to 0)
# base_preparation_time: int (greater than or equal to 0)
# is_available: bool
# category: CategoryResponse
# tags: list of TagResponse
class MenuItemResponse(ResponseSchema):
    id: int = Field(gt=0)
    category_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    alias: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None)
    photo_url: str | None = Field(default=None)
    base_price: Decimal = Field(ge=0)
    base_preparation_time: int = Field(ge=0)
    is_available: bool
    category: CategoryResponse
    tags: list[TagResponse] = Field(default_factory=list)


class MenuItemPage(ResponseSchema):
    items: list[MenuItemResponse] = Field(default_factory=list)
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)

# Schema for menu filters
class MenuFilters(BaseModel):
    search: str | None = Field(
        default=None,
        max_length=100,
    )
    category_id: int | None = Field(
        default=None,
        gt=0,
    )
    is_available: bool | None = None
    tag: str | None = Field(
        default=None,
        max_length=100,
    )
    buffet_id: int | None = Field(
        default=None,
        gt=0,
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=100,
    )
    offset: int = Field(
        default=0,
        ge=0,
    )

# Schema for creating an order item
# item_id: int (greater than 0)
# quantity: int (greater than or equal to 1, less than or equal to 20)
# notes: str or None (max length 500)
# The field validator normalizes the notes by stripping whitespace and converting empty strings to None.
class OrderItemCreate(RequestSchema):
    item_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=20)
    notes: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("notes")
    @classmethod
    def normalize_notes(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None

# Schema for creating an order
# client_request_id: UUID
# items: list of OrderItemCreate (min length 1, max length 50)
# The model validator checks for duplicate item_ids and ensures that the total quantity does not exceed 100.
class OrderCreate(RequestSchema):
    client_request_id: UUID
    items: list[OrderItemCreate] = Field(
        min_length=1,
        max_length=50,
    )

    @model_validator(mode="after")
    def validate_items(self) -> "OrderCreate":
        item_ids = [
            item.item_id
            for item in self.items
        ]

        if len(item_ids) != len(set(item_ids)):
            raise ValueError(
                "O pedido não pode conter artigos repetidos"
            )

        total_quantity = sum(
            item.quantity
            for item in self.items
        )

        if total_quantity > 100:
            raise ValueError(
                "The total quantity cannot exceed 100"
            )

        return self

# Schema for order menu item response
# id: int (greater than 0)
# name, alias: str (min length 1, max length 150)
# photo_url: str or None
class OrderMenuItemResponse(ResponseSchema):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    alias: str = Field(min_length=1, max_length=150)
    photo_url: str | None

# Schema for order item status response
# id: int (greater than 0)
# name, alias: str (min length 1, max length 100)
class StatusResponse(ResponseSchema):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=100)
    alias: str = Field(min_length=1, max_length=100)

# Schema for order item response
# id, item_id, status_id: int (greater than 0)
# quantity: int (greater than or equal to 1)
# notes: str or None
# unit_price_at_order: Decimal (greater than or equal to 0)
# menu_item: OrderMenuItemResponse
# status: StatusResponse
# created_at, updated_at: datetime
class OrderItemResponse(ResponseSchema):
    id: int = Field(gt=0)
    item_id: int = Field(gt=0)
    status_id: int = Field(gt=0)
    quantity: int = Field(ge=1)
    notes: str | None
    unit_price_at_order: Decimal = Field(ge=0)
    menu_item: OrderMenuItemResponse
    status: StatusResponse
    created_at: datetime
    updated_at: datetime

# Schema for order response
# id, guest_id: int (greater than 0)
# round_number: int (greater than or equal to 1)
# client_request_id: UUID
# created_at: datetime
# items: list of OrderItemResponse (default empty list)
class OrderResponse(ResponseSchema):
    id: int = Field(gt=0)
    guest_id: int = Field(gt=0)
    round_number: int = Field(ge=1)
    client_request_id: UUID
    created_at: datetime
    items: list[OrderItemResponse] = Field(
        default_factory=list,
    )

# Schema for service request creation
# type_alias: str (min length 1, max length 100, pattern for lowercase letters, numbers, underscores, and hyphens)
# The field validator normalizes the type_alias by stripping whitespace and converting it to lowercase.
class ServiceRequestCreate(RequestSchema):
    type_alias: str = Field(
        alias="type",
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_-]+$",
    )

    @field_validator("type_alias", mode="before")
    @classmethod
    def normalize_type_alias(
        cls,
        value: object,
    ) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

# Schema for service request type response
# id: int (greater than 0)
# name, alias: str (min length 1, max length 100)
# is_high_priority: bool
class ServiceRequestTypeResponse(ResponseSchema):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=100)
    alias: str = Field(min_length=1, max_length=100)
    is_high_priority: bool

# Schema for service request response
# id, session_id: int (greater than 0)
# request_type: ServiceRequestTypeResponse
# status: StatusResponse
# created_at: datetime
# resolved_at: datetime or None
class ServiceRequestResponse(ResponseSchema):
    id: int = Field(gt=0)
    session_id: int = Field(gt=0)
    request_type: ServiceRequestTypeResponse
    status: StatusResponse
    created_at: datetime
    resolved_at: datetime | None

# Schema for bill response
# session_id: int (greater than 0)
# buffet_total, extras_total, waste_total, tip_amount, total: Decimal (greater than or equal to 0)
# is_paid: bool
# paid_at: datetime or None
# The model validator checks the consistency between is_paid and paid_at fields, raising a ValueError if the conditions are not met.
class BillResponse(ResponseSchema):
    session_id: int = Field(gt=0)
    buffet_total: Decimal = Field(ge=0)
    extras_total: Decimal = Field(ge=0)
    waste_total: Decimal = Field(ge=0)
    tip_amount: Decimal = Field(ge=0)
    total: Decimal = Field(ge=0)
    is_paid: bool
    paid_at: datetime | None

    @model_validator(mode="after")
    def validate_payment_state(self) -> "BillResponse":
        if self.is_paid and self.paid_at is None:
            raise ValueError(
                "The paid account must have a payment date"
            )

        if not self.is_paid and self.paid_at is not None:
            raise ValueError(
                "A unpaid account cannot have a payment date"
            )

        return self

# Schema for tip update request
# tip_amount: Decimal (greater than or equal to 0, less than or equal to 10000, max digits 10, decimal places 2)
class TipUpdate(RequestSchema):
    tip_amount: Decimal = Field(
        ge=0,
        le=10000,
        max_digits=10,
        decimal_places=2,
    )
