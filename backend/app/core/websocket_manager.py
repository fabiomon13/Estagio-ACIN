import asyncio
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """
    Maintains the active WebSocket connections grouped by topic.

    Topics allow different application areas, such as kitchen, staff, or
    client views, to receive only the events that are relevant to them.

    The registry is stored in memory and therefore belongs to the current
    application process.
    """

    def __init__(self) -> None:
        # Maps each topic to the WebSocket connections currently subscribed
        # to that topic.
        self._connections: dict[str, list[WebSocket]] = {}

        # Reference to the application's asyncio event loop. It is used to
        # schedule asynchronous broadcasts from synchronous code.
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """
        Stores the application's running event loop.

        This should be called during application startup so synchronous code
        can safely schedule asynchronous WebSocket broadcasts.
        """
        self._loop = loop

    async def connect(self, topic: str, websocket: WebSocket) -> None:
        """
        Accepts a WebSocket connection and subscribes it to a topic.
        """
        await websocket.accept()

        # Create the topic entry when it does not exist, then register the
        # newly accepted connection.
        self._connections.setdefault(topic, []).append(websocket)

    def disconnect(self, topic: str, websocket: WebSocket) -> None:
        """
        Removes a WebSocket connection from a topic.

        The operation is ignored when the topic or connection is not
        currently registered.
        """
        connections = self._connections.get(topic, [])

        if websocket in connections:
            connections.remove(websocket)

        # Remove empty topic entries to keep the registry clean.
        if not connections:
            self._connections.pop(topic, None)

    async def _broadcast_async(
        self,
        topic: str,
        message: dict[str, Any],
    ) -> None:
        """
        Sends a JSON message to every connection subscribed to a topic.

        Connections that fail during delivery are considered inactive and
        removed from the registry after the broadcast iteration.
        """
        disconnected_connections: list[WebSocket] = []

        # Iterate over a copy so the original registry can be safely updated
        # when inactive connections are removed.
        for connection in list(self._connections.get(topic, [])):
            try:
                await connection.send_json(message)
            except Exception:
                # Delivery errors normally indicate that the client has
                # disconnected without completing the normal close flow.
                disconnected_connections.append(connection)

        for connection in disconnected_connections:
            self.disconnect(topic, connection)

    def broadcast(self, topic: str, message: dict[str, Any]) -> None:
        """
        Schedules a broadcast from synchronous application code.

        If the event loop has not been registered or is already closed, the
        message is ignored because no asynchronous task can be scheduled.
        """
        if self._loop is None or self._loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(
            self._broadcast_async(topic, message),
            self._loop,
        )


# Shared manager instance used by the application's WebSocket endpoints and
# services that publish real-time events.
connection_manager = ConnectionManager()