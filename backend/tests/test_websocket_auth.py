import pytest
from sqlalchemy.orm import sessionmaker

from app.api import deps


class FakeWebSocket:
    def __init__(self, cookies: dict[str, str] | None = None):
        self.cookies = cookies or {}


class FakeStaff:
    def __init__(self, is_active: bool = True):
        self.is_active = is_active


@pytest.mark.asyncio
async def test_returns_none_when_cookie_is_missing():
    result = await deps.authenticate_staff_websocket(FakeWebSocket())
    assert result is None


@pytest.mark.asyncio
async def test_returns_none_when_token_does_not_decode(monkeypatch):
    monkeypatch.setattr(deps, "decode_access_token", lambda token: None)

    ws = FakeWebSocket(cookies={"access_token": "garbage"})
    result = await deps.authenticate_staff_websocket(ws)

    assert result is None


@pytest.mark.asyncio
async def test_returns_staff_for_a_valid_active_session(monkeypatch):
    fake_staff = FakeStaff(is_active=True)
    monkeypatch.setattr(deps, "decode_access_token", lambda token: 42)
    monkeypatch.setattr(deps, "_load_staff_by_id", lambda staff_id: fake_staff)

    ws = FakeWebSocket(cookies={"access_token": "valid-token"})
    result = await deps.authenticate_staff_websocket(ws)

    assert result is fake_staff


@pytest.mark.asyncio
async def test_returns_none_for_an_inactive_staff(monkeypatch):
    fake_staff = FakeStaff(is_active=False)
    monkeypatch.setattr(deps, "decode_access_token", lambda token: 42)
    monkeypatch.setattr(deps, "_load_staff_by_id", lambda staff_id: fake_staff)

    ws = FakeWebSocket(cookies={"access_token": "valid-token"})
    result = await deps.authenticate_staff_websocket(ws)

    assert result is None


@pytest.mark.asyncio
async def test_returns_none_when_no_staff_row_exists(monkeypatch):
    monkeypatch.setattr(deps, "decode_access_token", lambda token: 999999)
    monkeypatch.setattr(deps, "_load_staff_by_id", lambda staff_id: None)

    ws = FakeWebSocket(cookies={"access_token": "valid-token"})
    result = await deps.authenticate_staff_websocket(ws)

    assert result is None


def test_load_staff_by_id_eager_loads_staff_role_so_it_survives_session_close(
    db_session, make_staff, monkeypatch
):
    """Regression test: _load_staff_by_id's session is always closed by the
    time its caller (kitchen_websocket, via staff_role()) touches
    staff.staff_role -- a WebSocket handshake has no request-scoped session
    to keep open the way get_current_staff()'s Depends(get_db) does. Without
    eager-loading staff_role up front, this raised DetachedInstanceError on
    every real WebSocket connection attempt (the mocked tests above never
    caught it since they replace _load_staff_by_id itself)."""
    staff = make_staff(role_name="Chef")
    staff_id = staff.id

    # Bind to db_session's own connection so this sees the same
    # not-yet-committed test data, without touching the real database.
    bound_session_local = sessionmaker(bind=db_session.connection(), autoflush=False, autocommit=False)
    monkeypatch.setattr(deps, "SessionLocal", bound_session_local)

    result = deps._load_staff_by_id(staff_id)

    assert result.staff_role.alias == "chef"
