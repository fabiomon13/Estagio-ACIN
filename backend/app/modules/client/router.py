# backend/app/modules/client/router.py

from fastapi import APIRouter

from app.modules.client.routes.billing import router as billing_router
from app.modules.client.routes.guests import router as guests_router
from app.modules.client.routes.menu import router as menu_router
from app.modules.client.routes.orders import router as orders_router
from app.modules.client.routes.service_requests import (
    router as service_requests_router,
)
from app.modules.client.routes.tables import router as tables_router


router = APIRouter()

router.include_router(tables_router)
router.include_router(guests_router)
router.include_router(menu_router)
router.include_router(orders_router)
router.include_router(service_requests_router)
router.include_router(billing_router)