from app.models.tag import Tag
from app.modules.client.security import hash_legacy_device_token


TOKEN = "client-device-token-that-is-long-enough-0001"


def _approved_context(
    make_staff,
    make_table,
    make_session,
    make_guest,
    *,
    num_clients=2,
    device_token=TOKEN,
):
    waiter = make_staff("Waiter")
    table = make_table()
    session = make_session(table, num_clients=num_clients, waiter=waiter)
    guest = make_guest(session=session, device_token=device_token)
    return table, session, guest


def _url(table, suffix=""):
    return f"/api/client/tables/{table.public_code}{suffix}"


def _headers(token=TOKEN):
    return {"X-Device-Token": token}


def test_get_table_and_missing_table(client, make_table):
    table = make_table()

    response = client.get(_url(table))
    assert response.status_code == 200
    assert response.json()["table_number"] == table.table_number
    assert client.get("/api/client/tables/not-a-uuid").status_code == 404


def test_create_session_and_reject_capacity_or_duplicate(client, make_table):
    table = make_table()
    table.max_capacity = 3

    too_many = client.post(_url(table, "/session"), json={"num_clients": 4})
    assert too_many.status_code == 422

    created = client.post(_url(table, "/session"), json={"num_clients": 3})
    assert created.status_code == 201
    assert created.json()["is_approved"] is False
    assert created.json()["available_places"] == 3

    duplicate = client.post(_url(table, "/session"), json={"num_clients": 1})
    assert duplicate.status_code == 409


def test_active_session_must_exist(client, make_table):
    table = make_table()
    assert client.get(_url(table, "/session")).status_code == 404


def test_create_guest_requires_approved_session(client, make_table, make_session):
    table = make_table()
    make_session(table, is_approved=False)

    response = client.post(
        _url(table, "/guests"),
        json={"device_token": TOKEN, "buffet_id": None},
    )
    assert response.status_code == 409


def test_create_guest_is_unique_and_respects_capacity(
    client, make_staff, make_table, make_session
):
    waiter = make_staff("Waiter")
    table = make_table()
    make_session(table, num_clients=1, waiter=waiter)

    first = client.post(
        _url(table, "/guests"),
        json={"device_token": TOKEN, "buffet_id": None},
    )
    assert first.status_code == 201

    duplicate = client.post(
        _url(table, "/guests"),
        json={"device_token": TOKEN, "buffet_id": None},
    )
    assert duplicate.status_code == 409

    full = client.post(
        _url(table, "/guests"),
        json={"device_token": "another-device-token-that-is-long-enough-0002"},
    )
    assert full.status_code == 409


def test_create_guest_rejects_unknown_buffet(
    client, make_staff, make_table, make_session
):
    waiter = make_staff("Waiter")
    table = make_table()
    make_session(table, waiter=waiter)
    response = client.post(
        _url(table, "/guests"),
        json={"device_token": TOKEN, "buffet_id": 999999},
    )
    assert response.status_code == 404


def test_guest_auth_rejects_missing_wrong_and_cross_session_tokens(
    client, make_staff, make_table, make_session, make_guest
):
    table, _session, _guest = _approved_context(
        make_staff, make_table, make_session, make_guest
    )
    other_table, _other_session, _other_guest = _approved_context(
        make_staff,
        make_table,
        make_session,
        make_guest,
        device_token="other-client-device-token-that-is-long-enough-0002",
    )

    assert client.get(_url(table, "/guests/me")).status_code == 401
    assert client.get(
        _url(table, "/guests/me"),
        headers=_headers("wrong-device-token-that-is-long-enough-9999"),
    ).status_code == 401
    assert client.get(
        _url(other_table, "/guests/me"), headers=_headers()
    ).status_code == 401


def test_legacy_device_token_is_accepted(
    client, db_session, make_staff, make_table, make_session, make_guest
):
    table, session, guest = _approved_context(
        make_staff, make_table, make_session, make_guest
    )
    guest.device_token_hash = hash_legacy_device_token(TOKEN)
    db_session.commit()

    assert client.get(_url(table, "/guests/me"), headers=_headers()).status_code == 200


def test_unapproved_session_blocks_existing_guest(
    client, db_session, make_staff, make_table, make_session, make_guest
):
    table, session, _guest = _approved_context(
        make_staff, make_table, make_session, make_guest
    )
    session.is_approved = False
    session.approved_at = None
    db_session.commit()

    assert client.get(_url(table, "/guests/me"), headers=_headers()).status_code == 409


def test_update_allergies_accepts_only_allergen_tags(
    client, db_session, make_staff, make_table, make_session, make_guest
):
    table, _session, _guest = _approved_context(
        make_staff, make_table, make_session, make_guest
    )
    allergen = Tag(name="Peanuts test", alias="alergenio-amendoim-test")
    ordinary = Tag(name="Vegan test", alias="vegan-test")
    db_session.add_all([allergen, ordinary])
    db_session.commit()

    accepted = client.put(
        _url(table, "/guests/me/allergy-preferences"),
        json={"allergy_tag_ids": [allergen.id]},
        headers=_headers(),
    )
    assert accepted.status_code == 200
    assert accepted.json()["allergy_tag_ids"] == [allergen.id]
    assert accepted.json()["allergy_preferences_completed_at"] is not None

    rejected = client.put(
        _url(table, "/guests/me/allergy-preferences"),
        json={"allergy_tag_ids": [ordinary.id]},
        headers=_headers(),
    )
    assert rejected.status_code == 422


def test_change_buffet_before_but_not_after_first_order(
    client, make_staff, make_table, make_session, make_guest, make_buffet, make_order
):
    table, _session, guest = _approved_context(
        make_staff, make_table, make_session, make_guest
    )
    buffet = make_buffet()

    changed = client.patch(
        _url(table, "/guests/me/buffet"),
        json={"buffet_id": buffet.id},
        headers=_headers(),
    )
    assert changed.status_code == 200
    assert changed.json()["buffet_id"] == buffet.id

    make_order(guest=guest)
    blocked = client.patch(
        _url(table, "/guests/me/buffet"),
        json={"buffet_id": None},
        headers=_headers(),
    )
    assert blocked.status_code == 409
