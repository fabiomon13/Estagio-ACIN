from app.models.dining_session import DiningSession


def _session_url(session: DiningSession, suffix: str = "") -> str:
    return f"/api/staff/sessions/{session.id}{suffix}"


# Verifies that approval assigns the active waiter with the lowest table load.
def test_approve_session_assigns_least_loaded_waiter(
    client,
    login_as,
    make_staff,
    make_table,
    make_session,
    monkeypatch,
):
    busy_waiter = make_staff("Waiter")
    available_waiter = make_staff("Waiter")
    make_session(make_table(), waiter=busy_waiter)
    pending = make_session(make_table(), is_approved=False)
    events = []
    monkeypatch.setattr(
        "app.modules.staff.staff_service.publish_session_event",
        lambda *args: events.append(args),
    )
    login_as(available_waiter)

    response = client.post(_session_url(pending, "/approve"))

    assert response.status_code == 200
    assert response.json()["waiter_id"] == available_waiter.id
    assert response.json()["is_approved"] is True
    assert events == [(pending.id, "session.changed")]


# Verifies approval errors for missing and already-approved sessions.
def test_approve_session_rejects_missing_or_approved_session(
    client,
    login_as,
    make_staff,
    make_session,
):
    waiter = make_staff("Waiter")
    approved = make_session(waiter=waiter)
    login_as(waiter)

    assert client.post("/api/staff/sessions/999999/approve").status_code == 404
    assert client.post(_session_url(approved, "/approve")).status_code == 400


# Verifies that session listings include active sessions and exclude inactive ones.
def test_list_staff_sessions_returns_only_active_sessions_by_default(
    client,
    login_as,
    make_staff,
    make_table,
    make_session,
):
    waiter = make_staff("Waiter")
    active = make_session(make_table(), waiter=waiter)
    make_session(make_table(), waiter=waiter, is_active=False)
    login_as(waiter)

    response = client.get("/api/staff/sessions")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [active.id]


def test_list_staff_sessions_includes_inactive_sessions_when_requested(
    client,
    login_as,
    make_staff,
    make_table,
    make_session,
):
    waiter = make_staff("Waiter")
    active = make_session(make_table(), waiter=waiter)
    inactive = make_session(make_table(), waiter=waiter, is_active=False)
    login_as(waiter)

    response = client.get("/api/staff/sessions?only_active=false")

    assert response.status_code == 200
    assert {item["id"] for item in response.json()["items"]} == {active.id, inactive.id}


# Verifies that a waiter can inspect an assigned session but not another table.
def test_session_detail_is_restricted_to_assigned_waiter_or_admin(
    client,
    login_as,
    make_staff,
    make_session,
    service_request_statuses,
):
    owner = make_staff("Waiter")
    other = make_staff("Waiter")
    admin = make_staff("Admin")
    session = make_session(waiter=owner)

    login_as(owner)
    own_response = client.get(_session_url(session))
    assert own_response.status_code == 200
    assert own_response.json()["session"]["id"] == session.id

    login_as(other)
    assert client.get(_session_url(session)).status_code == 403

    login_as(admin)
    assert client.get(_session_url(session)).status_code == 200
    assert client.get("/api/staff/sessions/999999").status_code == 404


# Verifies that deactivation cancels unresolved kitchen items and closes the session.
def test_deactivate_session_cancels_active_items(
    client,
    db_session,
    login_as,
    make_staff,
    make_session,
    make_guest,
    make_order,
    make_order_item,
    order_item_statuses,
):
    waiter = make_staff("Waiter")
    session = make_session(waiter=waiter)
    guest = make_guest(session=session)
    order = make_order(guest=guest)
    item = make_order_item(order=order, status_name="Ready")
    login_as(waiter)

    response = client.patch(_session_url(session, "/deactivate"))

    assert response.status_code == 200
    db_session.refresh(session)
    db_session.refresh(item)
    assert session.is_active is False
    assert session.end_time is not None
    assert session.waiter_id is None
    assert item.status_id == order_item_statuses["Cancelled"].id


# Verifies ownership and state errors when deactivating a dining session.
def test_deactivate_session_enforces_owner_and_active_state(
    client,
    login_as,
    make_staff,
    make_session,
    order_item_statuses,
):
    owner = make_staff("Waiter")
    other = make_staff("Waiter")
    active = make_session(waiter=owner)
    inactive = make_session(waiter=owner, is_active=False)
    login_as(other)
    assert client.patch(_session_url(active, "/deactivate")).status_code == 403

    login_as(owner)
    assert client.patch(_session_url(inactive, "/deactivate")).status_code == 409
    assert client.patch("/api/staff/sessions/999999/deactivate").status_code == 404
