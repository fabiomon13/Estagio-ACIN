import asyncio

import pytest

from app.core.websocket_manager import ConnectionManager


class FakeWebSocket:
    def __init__(self, fail: bool = False):
        self.sent: list[dict] = []
        self.fail = fail

    async def send_json(self, message: dict) -> None:
        if self.fail:
            raise RuntimeError("connection is dead")
        self.sent.append(message)


@pytest.mark.asyncio
async def test_connect_registers_under_topic():
    manager = ConnectionManager()
    ws = FakeWebSocket()

    class AcceptingFakeWebSocket(FakeWebSocket):
        async def accept(self) -> None:
            pass

    ws = AcceptingFakeWebSocket()
    await manager.connect("kitchen", ws)

    manager.bind_loop(asyncio.get_running_loop())
    manager.broadcast("kitchen", {"tickets": []})
    await asyncio.sleep(0.01)  # let the scheduled coroutine run (run_coroutine_threadsafe
    # needs a couple of loop iterations to actually execute, not just one -- a bare
    # `sleep(0)` only lets the call_soon_threadsafe callback create the Task; the Task's
    # own first step needs another iteration to run)

    assert ws.sent == [{"tickets": []}]


@pytest.mark.asyncio
async def test_broadcast_only_reaches_the_matching_topic():
    manager = ConnectionManager()
    manager.bind_loop(asyncio.get_running_loop())

    class AcceptingFakeWebSocket(FakeWebSocket):
        async def accept(self) -> None:
            pass

    kitchen_ws = AcceptingFakeWebSocket()
    staff_ws = AcceptingFakeWebSocket()
    await manager.connect("kitchen", kitchen_ws)
    await manager.connect("staff", staff_ws)

    manager.broadcast("kitchen", {"tickets": []})
    await asyncio.sleep(0.01)

    assert kitchen_ws.sent == [{"tickets": []}]
    assert staff_ws.sent == []


@pytest.mark.asyncio
async def test_broadcast_prunes_dead_connections_and_still_reaches_others():
    manager = ConnectionManager()
    manager.bind_loop(asyncio.get_running_loop())

    class AcceptingFakeWebSocket(FakeWebSocket):
        async def accept(self) -> None:
            pass

    dead_ws = AcceptingFakeWebSocket(fail=True)
    alive_ws = AcceptingFakeWebSocket()
    await manager.connect("kitchen", dead_ws)
    await manager.connect("kitchen", alive_ws)

    manager.broadcast("kitchen", {"tickets": []})
    await asyncio.sleep(0.01)

    assert alive_ws.sent == [{"tickets": []}]
    # The dead connection was pruned -- a second broadcast doesn't try it again
    # (if it did, the RuntimeError would propagate out of _broadcast_async and
    # fail this test via the unawaited-task warning turning into an error).
    manager.broadcast("kitchen", {"tickets": []})
    await asyncio.sleep(0.01)


@pytest.mark.asyncio
async def test_disconnect_removes_the_connection():
    manager = ConnectionManager()
    manager.bind_loop(asyncio.get_running_loop())

    class AcceptingFakeWebSocket(FakeWebSocket):
        async def accept(self) -> None:
            pass

    ws = AcceptingFakeWebSocket()
    await manager.connect("kitchen", ws)
    manager.disconnect("kitchen", ws)

    manager.broadcast("kitchen", {"tickets": []})
    await asyncio.sleep(0.01)

    assert ws.sent == []


def test_broadcast_before_loop_is_bound_does_not_raise():
    manager = ConnectionManager()
    manager.broadcast("kitchen", {"tickets": []})  # no loop bound yet -- must be a no-op, not an error


def test_broadcast_with_a_closed_bound_loop_does_not_raise():
    manager = ConnectionManager()
    loop = asyncio.new_event_loop()
    manager.bind_loop(loop)
    loop.close()

    # A stale loop reference (e.g. left over from a torn-down TestClient in
    # another test) must be a no-op too, not a crash for the calling thread.
    manager.broadcast("kitchen", {"tickets": []})
