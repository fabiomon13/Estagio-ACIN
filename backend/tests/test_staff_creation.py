CREATE_STAFF_URL = "/api/staff"

VALID_PASSWORD = "Str0ng!Pass"


def _payload(**overrides):
    payload = {
        "name": "Ana Silva",
        "email": "ana.silva@test.dev",
        "password": VALID_PASSWORD,
        "role": "waiter",
    }
    payload.update(overrides)
    return payload


def test_create_staff_requires_authentication(client):
    response = client.post(CREATE_STAFF_URL, json=_payload())
    assert response.status_code == 401


def test_non_admin_is_forbidden_from_creating_staff(client, login_as, make_staff):
    login_as(make_staff("Waiter"))
    response = client.post(CREATE_STAFF_URL, json=_payload())
    assert response.status_code == 403


def test_admin_can_create_a_staff_account(client, login_as, make_staff):
    login_as(make_staff("Admin"))
    response = client.post(CREATE_STAFF_URL, json=_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ana Silva"
    assert body["email"] == "ana.silva@test.dev"
    assert body["role"] == "waiter"
    assert body["is_active"] is True
    assert "password" not in body
    assert "password_hash" not in body


def test_creating_staff_with_an_email_already_in_use_is_rejected(client, login_as, make_staff):
    admin = make_staff("Admin")
    login_as(admin)
    first = client.post(CREATE_STAFF_URL, json=_payload(email="dup@test.dev"))
    assert first.status_code == 201

    second = client.post(CREATE_STAFF_URL, json=_payload(email="dup@test.dev"))
    assert second.status_code == 409


def test_password_missing_a_special_character_is_rejected(client, login_as, make_staff):
    login_as(make_staff("Admin"))
    response = client.post(CREATE_STAFF_URL, json=_payload(password="Password123"))
    assert response.status_code == 422


def test_password_shorter_than_eight_characters_is_rejected(client, login_as, make_staff):
    login_as(make_staff("Admin"))
    response = client.post(CREATE_STAFF_URL, json=_payload(password="Sh0rt!a"))
    assert response.status_code == 422


def test_password_missing_uppercase_is_rejected(client, login_as, make_staff):
    login_as(make_staff("Admin"))
    response = client.post(CREATE_STAFF_URL, json=_payload(password="lowercase1!"))
    assert response.status_code == 422


def test_password_missing_digit_is_rejected(client, login_as, make_staff):
    login_as(make_staff("Admin"))
    response = client.post(CREATE_STAFF_URL, json=_payload(password="NoDigits!!"))
    assert response.status_code == 422
