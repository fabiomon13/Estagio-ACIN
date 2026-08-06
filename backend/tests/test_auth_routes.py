def test_me_includes_is_active(client, login_as, make_staff, staff_roles):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["is_active"] is True


def test_update_my_shift_status_toggles_is_active(client, login_as, make_staff, staff_roles):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    response = client.patch("/api/auth/me/shift", json={"is_active": False})

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_update_my_shift_status_requires_authentication(client):
    response = client.patch("/api/auth/me/shift", json={"is_active": False})

    assert response.status_code == 401
