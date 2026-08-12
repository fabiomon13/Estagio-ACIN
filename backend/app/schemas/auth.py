import re

from pydantic import BaseModel, EmailStr

from app.core.roles import StaffRoleEnum

PASSWORD_REQUIREMENTS_DETAIL = (
    "A palavra-passe deve ter pelo menos 8 caracteres, incluindo uma letra "
    "maiúscula, uma letra minúscula, um número e um caractere especial."
)


# Kept separate from a Pydantic field_validator on purpose: a validator's
# ValueError becomes a 422 with `detail` as a list of error objects, but
# the frontend's apiFetch only surfaces `detail` when it's a plain string
# (see services/api/client.ts) -- so this is called explicitly from
# staff_service.create_staff, which raises an HTTPException with a string
# detail instead, consistent with every other business-rule check in the API.
def is_password_strong(password: str) -> bool:
    has_min_length = len(password) >= 8
    has_upper = re.search(r"[A-Z]", password) is not None
    has_lower = re.search(r"[a-z]", password) is not None
    has_digit = re.search(r"\d", password) is not None
    has_special = re.search(r"[^A-Za-z0-9]", password) is not None

    return has_min_length and has_upper and has_lower and has_digit and has_special


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
