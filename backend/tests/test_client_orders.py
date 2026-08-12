import uuid

TOKEN = "order-device-token-that-is-long-enough-0001"


def _context(make_staff, make_table, make_session, make_guest, *, buffet=None):
    waiter = make_staff("Waiter")
    table = make_table()
    session = make_session(table, num_clients=2, waiter=waiter)
    guest = make_guest(session=session, device_token=TOKEN, buffet=buffet)
    return table, session, guest


def _url(table, suffix="/orders"):
    return f"/api/client/tables/{table.public_code}{suffix}"


def _headers():
    return {"X-Device-Token": TOKEN}


def _payload(item, request_id=None, **item_overrides):
    return {
        "client_request_id": str(request_id or uuid.uuid4()),
        "items": [{"item_id": item.id, "quantity": 1, **item_overrides}],
    }

# tests for the client menu endpoints, including filtering, pagination, and data integrity
# Verifies price snapshots, note normalization, and sequential order rounds.
def test_create_order_snapshots_price_normalizes_notes_and_increments_round(
    client, db_session, order_item_statuses, make_staff, make_table,
    make_session, make_guest, make_menu_item
):
    table, _session, _guest = _context(make_staff, make_table, make_session, make_guest)
    item = make_menu_item()
    item.base_price = 12.50
    db_session.commit()

    first = client.post(_url(table), json=_payload(item, notes="  sem sal  "), headers=_headers())
    second = client.post(_url(table), json=_payload(item), headers=_headers())

    assert first.status_code == 201
    assert first.json()["round_number"] == 1
    assert first.json()["items"][0]["notes"] == "sem sal"
    assert first.json()["items"][0]["unit_price_at_order"] == "12.50"
    assert second.status_code == 201
    assert second.json()["round_number"] == 2

# tests for the client menu endpoints, including filtering, pagination, and data integrity
# Verifies that retrying the same client request does not create a second order.
def test_create_order_is_idempotent(
    client, order_item_statuses, make_staff, make_table, make_session, make_guest, make_menu_item
):
    table, _session, _guest = _context(make_staff, make_table, make_session, make_guest)
    item = make_menu_item()
    request_id = uuid.uuid4()
    payload = _payload(item, request_id)

    first = client.post(_url(table), json=payload, headers=_headers())
    retry = client.post(_url(table), json=payload, headers=_headers())
    assert retry.status_code == 201
    assert retry.json()["id"] == first.json()["id"]


# Verifies that missing, unavailable, duplicated, or excessive items are rejected.
def test_create_order_rejects_missing_unavailable_and_invalid_items(
    client, db_session, order_item_statuses, make_staff, make_table,
    make_session, make_guest, make_menu_item
):
    table, _session, _guest = _context(make_staff, make_table, make_session, make_guest)
    item = make_menu_item()
    item.is_available = False
    db_session.commit()

    assert client.post(_url(table), json=_payload(item), headers=_headers()).status_code == 422
    missing = {"client_request_id": str(uuid.uuid4()), "items": [{"item_id": 999999, "quantity": 1}]}
    assert client.post(_url(table), json=missing, headers=_headers()).status_code == 404
    duplicate = {
        "client_request_id": str(uuid.uuid4()),
        "items": [{"item_id": item.id, "quantity": 1}, {"item_id": item.id, "quantity": 1}],
    }
    assert client.post(_url(table), json=duplicate, headers=_headers()).status_code == 422
    assert client.post(_url(table), json=_payload(item, quantity=21), headers=_headers()).status_code == 422


# Verifies that a guest cannot list or retrieve another guest's orders.
def test_orders_are_isolated_between_guests(
    client, order_item_statuses, make_staff, make_table, make_session,
    make_guest, make_menu_item
):
    table, session, _first_guest = _context(make_staff, make_table, make_session, make_guest)
    second_token = "second-order-device-token-long-enough-0002"
    make_guest(session=session, device_token=second_token)
    item = make_menu_item()
    created = client.post(_url(table), json=_payload(item), headers=_headers()).json()

    second_headers = {"X-Device-Token": second_token}
    assert client.get(_url(table), headers=second_headers).json() == []
    assert client.get(_url(table, f"/orders/{created['id']}"), headers=second_headers).status_code == 404


# Verifies ownership and status rules when cancelling an order item.
def test_cancel_only_own_pending_item_and_publish_updates(
    client, order_item_statuses, make_staff, make_table, make_session,
    make_guest, make_menu_item, monkeypatch
):
    table, session, _guest = _context(make_staff, make_table, make_session, make_guest)
    item = make_menu_item()
    events = []
    monkeypatch.setattr("app.modules.client.routes.orders.publish_guest_event", lambda *args: events.append(args))
    created = client.post(_url(table), json=_payload(item), headers=_headers()).json()
    order_item = created["items"][0]

    cancelled = client.patch(
        _url(table, f"/orders/{created['id']}/items/{order_item['id']}/cancel"),
        headers=_headers(),
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"]["alias"] == "cancelled"
    assert events[-1][1] == "orders.changed"
    assert client.patch(
        _url(table, f"/orders/{created['id']}/items/{order_item['id']}/cancel"),
        headers=_headers(),
    ).status_code == 409

    second_token = "second-order-device-token-long-enough-0002"
    make_guest(session=session, device_token=second_token)
    assert client.patch(
        _url(table, f"/orders/{created['id']}/items/{order_item['id']}/cancel"),
        headers={"X-Device-Token": second_token},
    ).status_code == 404
