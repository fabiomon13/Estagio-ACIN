from pydantic import BaseModel, EmailStr

from app.core.roles import StaffRoleEnum


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateStaffRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: StaffRoleEnum
    photo_url: str | None = None


class StaffOut(BaseModel):
    id: int
    name: str
    email: str
    role: StaffRoleEnum
    photo_url: str | None
    is_active: bool


class UpdateShiftStatusRequest(BaseModel):
    is_active: bool
