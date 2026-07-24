from pydantic import BaseModel, EmailStr

from app.core.roles import StaffRoleEnum


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StaffOut(BaseModel):
    id: int
    name: str
    email: str
    role: StaffRoleEnum
