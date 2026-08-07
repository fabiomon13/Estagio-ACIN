# backend/app/modules/client/websocket.py

import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.websocket_manager import connection_manager
from app.db.dependencies import get_db
from app.modules.client.dependencies import (
    find_active_session,
    find_current_guest,
    find_table,
)
from app.modules.client.realtime import CLIENT_MENU_TOPIC, guest_topic, session_topic


ws_router = APIRouter(
    prefix="/client",
    tags=["Client - WebSocket"],
)


@ws_router.websocket("/tables/{table_code}/ws")
async def client_websocket(
    websocket: WebSocket,
    table_code: str,
    db: Session = Depends(get_db),
) -> None:
    await websocket.accept()

    topics: list[str] = []

    try:
        # O cliente tem cinco segundos para se autenticar.
        auth_message = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=5,
        )

        if auth_message.get("type") != "authenticate":
            await websocket.close(code=1008)
            return

        device_token = auth_message.get("device_token")

        if not isinstance(device_token, str):
            await websocket.close(code=1008)
            return

        table = find_table(table_code, db)
        dining_session = find_active_session(table.id, db)

        guest = find_current_guest(
            dining_session=dining_session,
            device_token=device_token,
            db=db,
        )

        if guest is None:
            await websocket.close(code=1008)
            return

        topics = [
            guest_topic(guest.id),
            session_topic(dining_session.id),
            CLIENT_MENU_TOPIC,
        ]

        # connect() já aceita a ligação. Como aceitámos acima,
        # é útil criar no manager uma variante subscribe().
        for topic in topics:
            connection_manager.subscribe(topic, websocket)

        await websocket.send_json({
            "type": "authenticated",
            "guest_id": guest.id,
        })

        while True:
            message = await websocket.receive_json()

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except TimeoutError:
        await websocket.close(code=1008)
    except WebSocketDisconnect:
        pass
    finally:
        for topic in topics:
            connection_manager.disconnect(topic, websocket)
