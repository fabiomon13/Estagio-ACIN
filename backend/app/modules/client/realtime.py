from typing import Literal, TypedDict

from app.core.websocket_manager import connection_manager


ClientEventType = Literal[
    "orders.changed",
    "service_requests.changed",
    "session.changed",
    "menu.changed",
]


class ClientEvent(TypedDict):
    type: ClientEventType


def guest_topic(guest_id: int) -> str:
    return f"client:guest:{guest_id}"


def session_topic(session_id: int) -> str:
    return f"client:session:{session_id}"


CLIENT_MENU_TOPIC = "client:menu"


def publish_guest_event(
    guest_id: int,
    event_type: ClientEventType,
) -> None:
    connection_manager.broadcast(
        guest_topic(guest_id),
        {"type": event_type},
    )


def publish_session_event(
    session_id: int,
    event_type: ClientEventType,
) -> None:
    connection_manager.broadcast(
        session_topic(session_id),
        {"type": event_type},
    )


def publish_menu_event() -> None:
    connection_manager.broadcast(
        CLIENT_MENU_TOPIC,
        {"type": "menu.changed"},
    )