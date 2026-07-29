from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.roles import StaffRoleEnum, staff_role
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.staff import Staff

ACCESS_TOKEN_COOKIE_NAME = "access_token"

INVALID_CREDENTIALS_DETAIL = "Credenciais inválidas"
FORBIDDEN_DETAIL = "Não tens permissão para aceder a esta página."


class InvalidSessionError(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS_DETAIL)


def get_current_staff(request: Request, db: Session = Depends(get_db)) -> Staff:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if token is None:
        raise InvalidSessionError()

    staff_id = decode_access_token(token)
    if staff_id is None:
        raise InvalidSessionError()

    staff = db.get(Staff, staff_id)
    if staff is None or not staff.is_active:
        raise InvalidSessionError()

    return staff


def require_role(*roles: StaffRoleEnum):
    def dependency(staff: Staff = Depends(get_current_staff)) -> Staff:
        current_role = staff_role(staff)
        if current_role != StaffRoleEnum.ADMIN and current_role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN_DETAIL)
        return staff

    return dependency


def require_exact_role(role: StaffRoleEnum):
    def dependency(staff: Staff = Depends(get_current_staff)) -> Staff:
        if staff_role(staff) != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=FORBIDDEN_DETAIL,
            )
        return staff

    return dependency
