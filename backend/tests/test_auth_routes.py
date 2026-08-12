from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.api.deps import INVALID_CREDENTIALS_DETAIL
from app.core.config import settings
from app.core.security import hash_password


LOGIN_URL = "/api/auth/login"
LOGOUT_URL = "/api/auth/logout"
ME_URL = "/api/auth/me"
SHIFT_URL = "/api/auth/me/shift"
PASSWORD = "correct-horse-battery-staple"


def _set_password(db_session, staff, password: str = PASSWORD) -> None:
    staff.password_hash = hash_password(password)
    db_session.commit()


def _token(payload: dict, secret: str | None = None) -> str:
    return jwt.encode(
        payload,
        secret or settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


# Verifies that valid credentials return the public staff profile and create
# the HTTP-only authentication cookie used by the protected routes.
def test_login_returns_profile_and_sets_secure_session_cookie(
    client,
    db_session,
    make_staff,
    staff_roles,
):
    staff = make_staff(role_name="Waiter")
    _set_password(db_session, staff)

    response = client.post(
        LOGIN_URL,
        json={"email": staff.email, "password": PASSWORD},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": staff.id,
        "name": staff.name,
        "email": staff.email,
        "role": "waiter",
        "photo_url": None,
        "is_active": True,
    }
    cookie = response.headers["set-cookie"].lower()
    assert "access_token=" in cookie
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/" in cookie
    assert f"max-age={settings.jwt_expire_minutes * 60}" in cookie
    assert "password" not in response.json()


# Invalid email and password combinations must have the same response so the
# endpoint does not reveal whether a staff account exists.
@pytest.mark.parametrize("credential", ["unknown_email", "wrong_password"])
def test_login_rejects_invalid_credentials_without_setting_cookie(
    client,
    db_session,
    make_staff,
    staff_roles,
    credential,
):
    staff = make_staff(role_name="Chef")
    _set_password(db_session, staff)
    email = "missing@test.dev" if credential == "unknown_email" else staff.email
    password = PASSWORD if credential == "unknown_email" else "wrong-password"

    response = client.post(LOGIN_URL, json={"email": email, "password": password})

    assert response.status_code == 401
    assert response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}
    assert "access_token=" not in response.headers.get("set-cookie", "").lower()


# Request validation rejects malformed or incomplete login bodies before the
# credentials reach the authentication service.
@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"email": "not-an-email", "password": PASSWORD},
        {"email": "staff@test.dev"},
    ],
)
def test_login_rejects_invalid_request_bodies(client, payload):
    response = client.post(LOGIN_URL, json=payload)
    assert response.status_code == 422


# is_active represents shift availability rather than an account ban. Staff
# outside their shift can therefore log in and reactivate themselves.
def test_inactive_staff_can_login_and_receives_inactive_status(
    client,
    db_session,
    make_staff,
    staff_roles,
):
    staff = make_staff(role_name="Waiter")
    staff.is_active = False
    _set_password(db_session, staff)

    response = client.post(
        LOGIN_URL,
        json={"email": staff.email, "password": PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False


# Every staff role can read its own authenticated profile.
@pytest.mark.parametrize("role_name", ["Admin", "Waiter", "Chef"])
def test_me_returns_authenticated_staff_for_every_role(
    client,
    login_as,
    make_staff,
    staff_roles,
    role_name,
):
    staff = make_staff(role_name=role_name)
    login_as(staff)

    response = client.get(ME_URL)

    assert response.status_code == 200
    assert response.json()["id"] == staff.id
    assert response.json()["role"] == role_name.lower()
    assert response.json()["is_active"] is True


# Protected auth routes reject requests that do not contain a session cookie.
@pytest.mark.parametrize(
    ("method", "path", "kwargs"),
    [
        ("get", ME_URL, {}),
        ("patch", SHIFT_URL, {"json": {"is_active": False}}),
    ],
)
def test_protected_auth_routes_require_authentication(client, method, path, kwargs):
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 401


# Invalid signatures, expired tokens, malformed subjects and deleted users all
# represent invalid sessions and receive the same 401 response.
@pytest.mark.parametrize(
    "token_kind",
    ["invalid_signature", "expired", "malformed_subject", "missing_staff"],
)
def test_me_rejects_invalid_expired_and_orphaned_tokens(
    client,
    token_kind,
):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "999999",
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }

    if token_kind == "invalid_signature":
        token = _token(payload, secret="a-different-signing-secret-123456")
    elif token_kind == "expired":
        payload["iat"] = now - timedelta(minutes=10)
        payload["exp"] = now - timedelta(minutes=5)
        token = _token(payload)
    elif token_kind == "malformed_subject":
        payload["sub"] = "not-a-staff-id"
        token = _token(payload)
    else:
        token = _token(payload)

    client.cookies.set("access_token", token)
    response = client.get(ME_URL)

    assert response.status_code == 401
    assert response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}


# Shift changes are persisted and immediately reflected by /auth/me.
@pytest.mark.parametrize("is_active", [False, True])
def test_update_my_shift_status_persists_change(
    client,
    login_as,
    make_staff,
    staff_roles,
    is_active,
):
    staff = make_staff(role_name="Chef")
    staff.is_active = not is_active
    login_as(staff)

    response = client.patch(SHIFT_URL, json={"is_active": is_active})

    assert response.status_code == 200
    assert response.json()["is_active"] is is_active
    assert client.get(ME_URL).json()["is_active"] is is_active


# The shift endpoint accepts only a boolean is_active value.
@pytest.mark.parametrize("payload", [{}, {"is_active": None}, {"is_active": "invalid"}])
def test_update_my_shift_status_validates_payload(
    client,
    login_as,
    make_staff,
    staff_roles,
    payload,
):
    login_as(make_staff(role_name="Chef"))
    response = client.patch(SHIFT_URL, json=payload)
    assert response.status_code == 422


# Logout expires the authentication cookie and subsequent protected requests
# from the same client are no longer authenticated.
def test_logout_clears_cookie_and_invalidates_client_session(
    client,
    db_session,
    make_staff,
    staff_roles,
):
    staff = make_staff(role_name="Admin")
    _set_password(db_session, staff)
    login_response = client.post(
        LOGIN_URL,
        json={"email": staff.email, "password": PASSWORD},
    )
    assert login_response.status_code == 200
    assert client.get(ME_URL).status_code == 200

    response = client.post(LOGOUT_URL)

    assert response.status_code == 204
    cookie = response.headers["set-cookie"].lower()
    assert "access_token=" in cookie
    assert "max-age=0" in cookie
    assert "path=/" in cookie
    assert client.get(ME_URL).status_code == 401


# Logout is idempotent and remains safe when no authenticated session exists.
def test_logout_without_session_still_succeeds(client):
    response = client.post(LOGOUT_URL)
    assert response.status_code == 204
