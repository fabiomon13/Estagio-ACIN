from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.routes.auth import staff_to_out
from app.core.roles import StaffRoleEnum, role_display_name
from app.core.security import hash_password
from app.db.session import get_db
from app.models.staff import Staff
from app.models.staff_role import StaffRole
from app.schemas.auth import CreateStaffRequest, StaffOut

router = APIRouter(prefix="/staff")


@router.get("/ping", dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def staff_ping() -> dict[str, str]:
    return {"message": "pong"}


@router.post(
    "",
    response_model=StaffOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(StaffRoleEnum.ADMIN))],
)
def create_staff(payload: CreateStaffRequest, db: Session = Depends(get_db)) -> StaffOut:
    existing = db.query(Staff).filter(Staff.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta com este email.",
        )

    role_row = db.query(StaffRole).filter(StaffRole.name == role_display_name(payload.role)).first()
    if role_row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Staff role '{role_display_name(payload.role)}' not seeded.",
        )

    staff = Staff(
        staff_role_id=role_row.id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(staff)
    db.commit()

    return staff_to_out(staff)
