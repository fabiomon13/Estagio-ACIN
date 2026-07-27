# API tests for Kitchen endpoints using the real FastAPI app.
# Covers routing, authentication, permissions and JSON validation.

# ---- Access control ----

def test_chef_can_list_tickets(client, make_staff, login_as, order_item_statuses, make_order_item):
    make_order_item(status_name="Pending")
    login_as(make_staff("Chef"))

    response = client.get("/api/kitchen/tickets")

    assert response.status_code == 200
    assert len(response.json()) == 1


# Admins bypass role restrictions.
def test_admin_can_list_tickets(client, make_staff, login_as, order_item_statuses, make_order_item):
    make_order_item(status_name="Pending")
    login_as(make_staff("Admin"))

    response = client.get("/api/kitchen/tickets")

    assert response.status_code == 200


def test_waiter_gets_403(client, make_staff, login_as):
    login_as(make_staff("Waiter"))

    response = client.get("/api/kitchen/tickets")

    assert response.status_code == 403


def test_unauthenticated_gets_401(client):
    response = client.get("/api/kitchen/tickets")

    assert response.status_code == 401


# ---- Status updates ----

# ---- PATCH /order-items/{id}/status ----

def test_patch_advances_status(client, make_staff, login_as, order_item_statuses, make_order_item):
    item = make_order_item(status_name="Pending")
    login_as(make_staff("Chef"))

    response = client.patch(
        f"/api/kitchen/order-items/{item.id}/status",
        json={"status": "Preparing"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Preparing"


def test_patch_invalid_transition_returns_409(
    client, make_staff, login_as, order_item_statuses, make_order_item
):
    item = make_order_item(status_name="Ready")
    login_as(make_staff("Chef"))

    response = client.patch(
        f"/api/kitchen/order-items/{item.id}/status",
        json={"status": "Preparing"},
    )

    assert response.status_code == 409


# Pydantic rejects unsupported status values.
def test_patch_unsupported_status_value_returns_422(
    client, make_staff, login_as, order_item_statuses, make_order_item
):
    item = make_order_item(status_name="Pending")
    login_as(make_staff("Chef"))

    response = client.patch(
        f"/api/kitchen/order-items/{item.id}/status",
        json={"status": "Served"},
    )

    assert response.status_code == 422


def test_patch_missing_item_returns_404(client, make_staff, login_as, order_item_statuses):
    login_as(make_staff("Chef"))

    response = client.patch(
        "/api/kitchen/order-items/999999/status",
        json={"status": "Preparing"},
    )

    assert response.status_code == 404
