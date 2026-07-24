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
    buffet_id: int
    device_token: str = Field(min_length=32)


class GuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    buffet_id: int


class BuffetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: Decimal
    waste_charge: Decimal
