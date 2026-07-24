from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.staff import router as staff_router
from app.modules.client.router import router as client_router

api_router = APIRouter()

api_router.include_router(
    health_router,
    tags=["Health"],
)

api_router.include_router(
    client_router,
    prefix="/client",
    tags=["Client"],
)

api_router.include_router(
    auth_router,
    tags=["Auth"],
)

api_router.include_router(
    staff_router,
    tags=["Staff"],
)