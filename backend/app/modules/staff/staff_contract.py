from datetime import datetime
from enum import StrEnum

from decimal import Decimal

from pydantic import BaseModel, Field

#Define the possible states of a table in the staff dashboard
class StaffTableState(StrEnum):
    AWAITING_APPROVAL = "awaiting_approval"
    ACTIVE = "active"
    INACTIVE = "inactive"
    PAYMENT_REQUESTED = "payment_requested"

#Define the possible types of requests that can be made to staff members
class StaffRequestType(StrEnum):
    ASSISTANCE = "assistance"
    PAYMENT_REQUEST = "payment_request"

#Define the possible priorities of requests that can be made to staff members
#Define the data models for the staff dashboard, including summary information, table information and open requests
class StaffDashboardSummary(BaseModel):
    occupied_tables: int
    guest_count: int
    open_requests: int

#Define the data model for a table in the staff dashboard
class StaffDashboardTable(BaseModel):
    session_id: int | None = None
    table_number: int
    guest_count: int
    state: StaffTableState
    started_at: datetime | None = None
    ready_item_count: int
    total: str
    waiter_name: str | None = None
    waiter_id: int | None = None

#Define the data model for an item that is ready to be served to a table
class StaffReadyItem(BaseModel):
    id: int
    name: str
    quantity: int

#Define the data model for a table that has items ready to be served
class StaffReadyTable(BaseModel):
    table_number: int
    items: list[StaffReadyItem]


class MenuItemAvailabilityUpdate(BaseModel):
    is_available: bool


class MenuItemAvailabilityResponse(BaseModel):
    id: int
    is_available: bool

#Define the data model for an open request made to a staff member
class StaffOpenRequest(BaseModel):
    id: int
    table_number: int
    type: StaffRequestType
    is_high_priority: bool
    created_at: datetime


class StaffPreparingItem(BaseModel):
    id: int
    name: str
    quantity: int
    status: str
    preparation_started_at: datetime
    estimated_ready_at: datetime


class StaffPreparingTable(BaseModel):
    table_number: int
    waiter_id: int
    items: list[StaffPreparingItem]

class StaffPaymentCreate(BaseModel):
    method: str = Field(min_length=1, max_length=30)
    tip_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    waste_count: int = Field(default=0, ge=0)


class StaffPaymentResponse(BaseModel):
    session_id: int
    amount_paid: Decimal
    method: str
    tip_amount: Decimal
    waste_count: int
    paid_at: datetime

class StaffSessionBillGuest(BaseModel):
    guest_id: int
    label: str
    buffet_total: Decimal
    extras_total: Decimal
    total: Decimal


class StaffSessionBillResponse(BaseModel):
    session_id: int
    guests: list[StaffSessionBillGuest]
    subtotal: Decimal
    waste_box_count: int
    waste_total: Decimal
    tip_amount: Decimal
    total: Decimal
    is_paid: bool
    paid_at: datetime | None

class StaffDashboard(BaseModel):
    summary: StaffDashboardSummary
    tables: list[StaffDashboardTable]
    ready_to_serve: list[StaffReadyTable]
    requests: list[StaffOpenRequest]
    preparing_orders: list[StaffPreparingTable]


class StaffPaymentHistoryFilters(BaseModel):
    table_number: int | None = None
    method: str | None = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class StaffPaymentHistoryItemOut(BaseModel):
    payment_id: int
    session_id: int
    table_number: int
    guest_count: int
    waiter_name: str | None
    amount_paid: Decimal
    tip_amount: Decimal
    method: str
    waste_count: int
    paid_at: datetime


class StaffPaymentHistoryListOut(BaseModel):
    items: list[StaffPaymentHistoryItemOut]
    total_count: int


class StaffSessionHistoryItemOut(BaseModel):
    id: int
    table_number: int | None
    is_active: bool
    is_approved: bool
    guests_count: int
    waiter_name: str | None
    start_time: datetime
    end_time: datetime | None
    has_payment: bool
    payment_total: Decimal | None
    owed_total: Decimal | None


class StaffSessionHistoryListOut(BaseModel):
    items: list[StaffSessionHistoryItemOut]
    total_count: int