import pytest


STAFF_SESSIONS_URL = "/api/staff/sessions"


# Verifies that every staff route requires an authenticated staff session.
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/staff/dashboard"),
        ("get", STAFF_SESSIONS_URL),
        ("get", "/api/staff/requests"),
        ("get", "/api/staff/sessions/999999/bill"),
        ("post", "/api/staff/sessions/999999/approve"),
        ("patch", "/api/staff/orders/items/999999/serve"),
    ],
)
def test_staff_routes_require_authentication(client, method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 401


# Verifies that chefs cannot use waiter-only staff endpoints.
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/staff/dashboard"),
        ("get", STAFF_SESSIONS_URL),
        ("get", "/api/staff/requests"),
        ("post", "/api/staff/sessions/999999/approve"),
    ],
)
def test_chef_is_forbidden_from_waiter_routes(
    client,
    login_as,
    make_staff,
    method,
    path,
):
    login_as(make_staff("Chef"))
    response = getattr(client, method)(path)
    assert response.status_code == 403


# Verifies that waiters and admins can enter the staff route group.
@pytest.mark.parametrize("role_name", ["Waiter", "Admin"])
def test_waiter_and_admin_can_list_staff_sessions(
    client,
    login_as,
    make_staff,
    role_name,
):
    login_as(make_staff(role_name))
    response = client.get(STAFF_SESSIONS_URL)
    assert response.status_code == 200
    assert response.json() == {"items": [], "total_count": 0}


# Verifies the dashboard summary and visibility of inactive restaurant tables.
def test_dashboard_returns_summary_and_all_tables(
    client,
    login_as,
    make_staff,
    make_table,
    order_item_statuses,
):
    waiter = make_staff("Waiter")
    table = make_table()
    login_as(waiter)

    response = client.get("/api/staff/dashboard")

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"] == {
        "occupied_tables": 0,
        "guest_count": 0,
        "open_requests": 0,
    }
    assert payload["tables"] == [
        {
            "session_id": None,
            "table_number": table.table_number,
            "guest_count": 0,
            "state": "inactive",
            "started_at": None,
            "ready_item_count": 0,
            "total": "$0.00",
            "waiter_name": None,
            "waiter_id": None,
        }
    ]
