from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import authenticate_staff_websocket
from app.core.roles import StaffRoleEnum, staff_role
from app.core.websocket_manager import connection_manager

KITCHEN_TOPIC = "kitchen"

ws_router = APIRouter(prefix="/kitchen", tags=["Kitchen"])


@ws_router.websocket("/ws")
async def kitchen_websocket(websocket: WebSocket) -> None:
    staff = await authenticate_staff_websocket(websocket)
    if staff is None or staff_role(staff) not in (StaffRoleEnum.CHEF, StaffRoleEnum.ADMIN):
        await websocket.close(code=1008)  # policy violation
        return

    await connection_manager.connect(KITCHEN_TOPIC, websocket)
    try:
        while True:
            await websocket.receive_text()  # just keeps the connection open; client never sends anything
    except WebSocketDisconnect:
        connection_manager.disconnect(KITCHEN_TOPIC, websocket)
