from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import authenticate_staff_websocket
from app.core.roles import StaffRoleEnum, staff_role
from app.core.websocket_manager import connection_manager
from app.modules.staff.websockets.staff_realtime import (
    STAFF_TOPIC_PREFIX,
)

ws_router = APIRouter(prefix="/staff", tags=["Staff"])


@ws_router.websocket("/ws")
async def staff_websocket(websocket: WebSocket) -> None:
    staff = await authenticate_staff_websocket(websocket)

    if staff is None or staff_role(staff) not in (
        StaffRoleEnum.WAITER,
        StaffRoleEnum.ADMIN,
    ):
        await websocket.close(code=1008)
        return

    topic = f"{STAFF_TOPIC_PREFIX}:{staff.id}"
    await connection_manager.connect(topic, websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(topic, websocket)
