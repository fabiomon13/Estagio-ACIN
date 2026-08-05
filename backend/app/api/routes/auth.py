from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import ACCESS_TOKEN_COOKIE_NAME, INVALID_CREDENTIALS_DETAIL, get_current_staff
from app.core.config import settings
from app.core.roles import staff_role
from app.core.security import create_access_token, verify_password
from app.db.dependencies import get_db
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, StaffOut

router = APIRouter(prefix="/auth")


def staff_to_out(staff: Staff) -> StaffOut:
    return StaffOut(
        id=staff.id,
        name=staff.name,
        email=staff.email,
        role=staff_role(staff),
        photo_url=staff.photo_url,
    )


def _set_access_token_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
        max_age=settings.jwt_expire_minutes * 60,
    )


@router.post("/login", response_model=StaffOut)
def login(credentials: LoginRequest, response: Response, db: Session = Depends(get_db)) -> StaffOut:
    staff = db.query(Staff).filter(Staff.email == credentials.email).first()

    if staff is None or not verify_password(credentials.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS_DETAIL)

    token = create_access_token(staff.id)
    _set_access_token_cookie(response, token)
    return staff_to_out(staff)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, path="/")


@router.get("/me", response_model=StaffOut)
def me(staff: Staff = Depends(get_current_staff)) -> StaffOut:
    return staff_to_out(staff)
