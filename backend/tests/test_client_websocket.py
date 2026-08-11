import pytest
from starlette.websockets import WebSocketDisconnect


TOKEN = "websocket-device-token-that-is-long-enough-0001"


def _context(make_staff, make_table, make_session, make_guest):
    waiter = make_staff("Waiter")
    table = make_table()
    session = make_session(table, waiter=waiter)
    guest = make_guest(session=session, device_token=TOKEN)
    return table, session, guest


def test_client_socket_authenticates_and_responds_to_ping(
    client, make_staff, make_table, make_session, make_guest
):
    table, _session, guest = _context(make_staff, make_table, make_session, make_guest)
    with client.websocket_connect(f"/api/client/tables/{table.public_code}/ws") as socket:
        socket.send_json({"type": "authenticate", "device_token": TOKEN})
        assert socket.receive_json() == {"type": "authenticated", "guest_id": guest.id}
        socket.send_json({"type": "ping"})
        assert socket.receive_json() == {"type": "pong"}


@pytest.mark.parametrize(
    "message",
    [
        {"type": "wrong", "device_token": TOKEN},
        {"type": "authenticate"},
        {"type": "authenticate", "device_token": 123},
        {"type": "authenticate", "device_token": "wrong-token"},
    ],
)
def test_client_socket_rejects_invalid_authentication(
    client, make_staff, make_table, make_session, make_guest, message
):
    table, _session, _guest = _context(make_staff, make_table, make_session, make_guest)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/api/client/tables/{table.public_code}/ws") as socket:
            socket.send_json(message)
            socket.receive_json()
    assert exc_info.value.code == 1008
