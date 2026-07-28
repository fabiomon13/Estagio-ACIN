from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

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

#Define the data model for an item that is ready to be served to a table
class StaffReadyItem(BaseModel):
    id: int
    name: str
    quantity: int

#Define the data model for a table that has items ready to be served
class StaffReadyTable(BaseModel):
    table_number: int
    items: list[StaffReadyItem]

#Define the data model for an open request made to a staff member
class StaffOpenRequest(BaseModel):
    id: int
    table_number: int
    type: StaffRequestType
    is_high_priority: bool
    created_at: datetime

#Define the overall data model for the staff dashboard
class StaffDashboard(BaseModel):
    summary: StaffDashboardSummary
    tables: list[StaffDashboardTable]
    ready_to_serve: list[StaffReadyTable]
    requests: list[StaffOpenRequest]
