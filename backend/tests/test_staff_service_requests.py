from datetime import datetime, timezone


def _request_url(request_id: int, suffix: str = "") -> str:
    return f"/api/staff/requests/{request_id}{suffix}"


# Verifies that waiters list only pending requests for their assigned sessions.
def test_waiter_lists_only_requests_from_assigned_active_sessions(
    client,
    login_as,
    make_staff,
    make_session,
    make_service_request,
):
    waiter = make_staff("Waiter")
    other = make_staff("Waiter")
    own_session = make_session(waiter=waiter)
    other_session = make_session(waiter=other)
    own_request = make_service_request(session=own_session)
    make_service_request(session=other_session)
    make_service_request(
        session=own_session,
        status_name="Resolved",
        resolved_at=datetime.now(timezone.utc),
    )
    login_as(waiter)

    response = client.get("/api/staff/requests")

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert [item["id"] for item in response.json()["items"]] == [own_request.id]


# Verifies that admins can list pending requests from every active session.
def test_admin_lists_requests_from_all_sessions(
    client,
    login_as,
    make_staff,
    make_session,
    make_service_request,
):
    first_waiter = make_staff("Waiter")
    second_waiter = make_staff("Waiter")
    admin = make_staff("Admin")
    first = make_service_request(session=make_session(waiter=first_waiter))
    second = make_service_request(session=make_session(waiter=second_waiter))
    login_as(admin)

    response = client.get("/api/staff/requests")

    assert response.status_code == 200
    assert {item["id"] for item in response.json()["items"]} == {first.id, second.id}


# Verifies request detail visibility for owner, other waiter, and admin.
def test_request_detail_is_restricted_to_assigned_waiter_or_admin(
    client,
    login_as,
    make_staff,
    make_session,
    make_service_request,
):
    owner = make_staff("Waiter")
    other = make_staff("Waiter")
    admin = make_staff("Admin")
    request = make_service_request(session=make_session(waiter=owner))

    login_as(owner)
    response = client.get(_request_url(request.id))
    assert response.status_code == 200
    assert response.json()["request"]["id"] == request.id

    login_as(other)
    assert client.get(_request_url(request.id)).status_code == 403

    login_as(admin)
    assert client.get(_request_url(request.id)).status_code == 200
    assert client.get(_request_url(999999)).status_code == 404


# Verifies that resolving a request persists the state and publishes an update.
def test_resolve_request_updates_status_and_realtime_event(
    client,
    db_session,
    login_as,
    make_staff,
    make_session,
    make_service_request,
    service_request_statuses,
    monkeypatch,
):
    waiter = make_staff("Waiter")
    request = make_service_request(session=make_session(waiter=waiter))
    events = []
    monkeypatch.setattr(
        "app.modules.staff.staff_service.publish_session_event",
        lambda *args: events.append(args),
    )
    login_as(waiter)

    response = client.patch(_request_url(request.id, "/resolve"))

    assert response.status_code == 200
    assert response.json()["updated_status_alias"] == "resolved"
    db_session.refresh(request)
    assert request.status_id == service_request_statuses["Resolved"].id
    assert request.resolved_at is not None
    assert events == [(request.session_id, "service_requests.changed")]


# Verifies ownership, missing-request, and repeated-resolution errors.
def test_resolve_request_rejects_invalid_transitions_or_waiter(
    client,
    login_as,
    make_staff,
    make_session,
    make_service_request,
):
    owner = make_staff("Waiter")
    other = make_staff("Waiter")
    request = make_service_request(session=make_session(waiter=owner))

    login_as(other)
    assert client.patch(_request_url(request.id, "/resolve")).status_code == 403

    login_as(owner)
    assert client.patch(_request_url(request.id, "/resolve")).status_code == 200
    assert client.patch(_request_url(request.id, "/resolve")).status_code == 409
    assert client.patch(_request_url(999999, "/resolve")).status_code == 404
