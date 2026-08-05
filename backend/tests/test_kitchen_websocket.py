import pytest

from app.modules.kitchen import websocket as kitchen_ws


class FakeStaff:
    def __init__(self, role_alias: str, is_active: bool = True):
        self.role_alias = role_alias
        self.is_active = is_active


def _stub_staff_role(monkeypatch, role_value):
    """staff_role() reads staff.staff_role.alias in the real app; the
    websocket layer only ever calls it on whatever authenticate_staff_websocket
    returned, so stubbing staff_role() itself (rather than building a real
    Staff+StaffRole ORM graph) keeps this test focused on the endpoint's own
    branching, not the ORM."""
    monkeypatch.setattr(kitchen_ws, "staff_role", lambda staff: role_value)


def test_connects_when_authenticated_as_chef(client, monkeypatch):
    from app.core.roles import StaffRoleEnum

    async def fake_auth(websocket):
        return FakeStaff(role_alias="chef")

    monkeypatch.setattr(kitchen_ws, "authenticate_staff_websocket", fake_auth)
    _stub_staff_role(monkeypatch, StaffRoleEnum.CHEF)

    with client.websocket_connect("/api/kitchen/ws") as websocket:
        # Connection accepted -- if authentication or the role check had
        # failed, the server would close before this context manager's
        # __enter__ returns, raising a WebSocketDisconnect here instead.
        websocket.close()


def test_rejects_when_not_authenticated(client, monkeypatch):
    async def fake_auth(websocket):
        return None

    monkeypatch.setattr(kitchen_ws, "authenticate_staff_websocket", fake_auth)

    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/kitchen/ws"):
            pass

    assert exc_info.value.code == 1008


def test_rejects_wrong_role(client, monkeypatch):
    from app.core.roles import StaffRoleEnum

    async def fake_auth(websocket):
        return FakeStaff(role_alias="waiter")

    monkeypatch.setattr(kitchen_ws, "authenticate_staff_websocket", fake_auth)
    _stub_staff_role(monkeypatch, StaffRoleEnum.WAITER)

    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/kitchen/ws"):
            pass

    assert exc_info.value.code == 1008


def test_connected_socket_receives_a_broadcast(client, monkeypatch):
    from app.core.roles import StaffRoleEnum

    async def fake_auth(websocket):
        return FakeStaff(role_alias="chef")

    monkeypatch.setattr(kitchen_ws, "authenticate_staff_websocket", fake_auth)
    _stub_staff_role(monkeypatch, StaffRoleEnum.CHEF)

    with client.websocket_connect("/api/kitchen/ws") as websocket:
        kitchen_ws.connection_manager.broadcast(kitchen_ws.KITCHEN_TOPIC, {"tickets": []})
        message = websocket.receive_json()
        assert message == {"tickets": []}
