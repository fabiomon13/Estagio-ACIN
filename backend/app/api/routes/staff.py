from fastapi import APIRouter, Depends

from app.api.deps import require_role
from app.core.roles import StaffRoleEnum

router = APIRouter(prefix="/staff")


@router.get("/ping", dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def staff_ping() -> dict[str, str]:
    return {"message": "pong"}
