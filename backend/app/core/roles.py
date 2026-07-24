from enum import Enum

from app.models.staff import Staff


class StaffRoleEnum(str, Enum):
    ADMIN = "admin"
    WAITER = "waiter"
    CHEF = "chef"


def staff_role(staff: Staff) -> StaffRoleEnum:
    return StaffRoleEnum(staff.staff_role.name.lower())


def role_display_name(role: StaffRoleEnum) -> str:
    return role.value.capitalize()
