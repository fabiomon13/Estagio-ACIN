import asyncio
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """
    Gere ligações WebSocket agrupadas por tópico.

    Exemplos de tópicos:
    - kitchen
    - staff
    - client:guest:15
    - client:session:8
    """

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(
        self,
        loop: asyncio.AbstractEventLoop,
    ) -> None:
        """
        Guarda o event loop principal da aplicação.

        Permite que serviços síncronos agendem broadcasts
        assíncronos de forma segura.
        """
        self._loop = loop

    async def connect(
        self,
        topic: str,
        websocket: WebSocket,
    ) -> None:
        """
        Aceita uma ligação WebSocket e adiciona-a ao tópico.
        """
        await websocket.accept()
        self.subscribe(topic, websocket)

    def subscribe(
        self,
        topic: str,
        websocket: WebSocket,
    ) -> None:
        """
        Adiciona ao tópico um WebSocket que já foi aceite.

        É útil quando o endpoint precisa de aceitar primeiro a
        ligação e só depois autenticar o cliente.
        """
        connections = self._connections.setdefault(topic, [])

        if websocket not in connections:
            connections.append(websocket)

    def disconnect(
        self,
        topic: str,
        websocket: WebSocket,
    ) -> None:
        """
        Remove uma ligação de um tópico.
        """
        connections = self._connections.get(topic)

        if connections is None:
            return

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self._connections.pop(topic, None)

    async def send_personal(
        self,
        websocket: WebSocket,
        message: dict[str, Any],
    ) -> bool:
        """
        Envia uma mensagem para uma ligação específica.

        Retorna False se já não for possível comunicar com
        essa ligação.
        """
        try:
            await websocket.send_json(message)
        except Exception:
            return False

        return True

    async def _broadcast_async(
        self,
        topic: str,
        message: dict[str, Any],
    ) -> None:
        """
        Envia uma mensagem para todas as ligações do tópico.

        Ligações que falhem durante o envio são removidas.
        """
        connections = list(
            self._connections.get(topic, [])
        )

        if not connections:
            return

        results = await asyncio.gather(
            *(
                self.send_personal(websocket, message)
                for websocket in connections
            ),
            return_exceptions=True,
        )

        for websocket, result in zip(
            connections,
            results,
            strict=True,
        ):
            if result is not True:
                self.disconnect(topic, websocket)

    def broadcast(
        self,
        topic: str,
        message: dict[str, Any],
    ) -> None:
        """
        Agenda um broadcast a partir de código síncrono.

        Este método não bloqueia a operação HTTP que originou
        o evento.
        """
        loop = self._loop

        if loop is None or loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(
            self._broadcast_async(topic, message),
            loop,
        )

    async def broadcast_async(
        self,
        topic: str,
        message: dict[str, Any],
    ) -> None:
        """
        Executa diretamente um broadcast a partir de código
        assíncrono.
        """
        await self._broadcast_async(topic, message)

    def topic_connection_count(
        self,
        topic: str,
    ) -> int:
        """
        Retorna o número de ligações num tópico.

        Útil para testes e monitorização.
        """
        return len(self._connections.get(topic, []))

    def total_connection_count(self) -> int:
        """
        Retorna o número total de ligações WebSocket.
        """
        return sum(
            len(connections)
            for connections in self._connections.values()
        )


connection_manager = ConnectionManager()