from decimal import Decimal

from app.models.buffet_item import BuffetItem
from app.models.payment import Payment


def _session_url(session_id: int, suffix: str) -> str:
    return f"/api/staff/sessions/{session_id}{suffix}"


# Verifies the per-guest and session totals returned before payment.
def test_get_session_bill_returns_buffet_and_extra_totals(
    client,
    db_session,
    login_as,
    make_staff,
    make_session,
    make_guest,
    make_buffet,
    make_menu_item,
    make_order,
    make_order_item,
    order_item_statuses,
):
    waiter = make_staff("Waiter")
    buffet = make_buffet(price="25.00")
    session = make_session(waiter=waiter, num_clients=2)
    buffet_guest = make_guest(session=session, buffet=buffet)
    extra_guest = make_guest(session=session)
    included = make_menu_item()
    extra = make_menu_item()
    db_session.add(BuffetItem(buffet_id=buffet.id, menu_item_id=included.id))
    buffet_order = make_order(guest=buffet_guest)
    make_order_item(order=buffet_order, menu_item=included, status_name="Served")
    extra_order = make_order(guest=extra_guest)
    extra_item = make_order_item(order=extra_order, menu_item=extra, status_name="Served")
    extra_item.quantity = 2
    extra_item.unit_price_at_order = Decimal("7.50")
    db_session.commit()
    login_as(waiter)

    response = client.get(_session_url(session.id, "/bill"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["subtotal"] == "40.00"
    assert payload["total"] == "40.00"
    assert payload["is_paid"] is False
    assert [guest["total"] for guest in payload["guests"]] == ["25.00", "15.00"]


# Verifies that bill details are restricted to the assigned waiter or an admin.
def test_get_session_bill_enforces_ownership_and_missing_session(
    client,
    login_as,
    make_staff,
    make_session,
):
    owner = make_staff("Waiter")
    other = make_staff("Waiter")
    admin = make_staff("Admin")
    session = make_session(waiter=owner)

    login_as(other)
    assert client.get(_session_url(session.id, "/bill")).status_code == 403

    login_as(admin)
    assert client.get(_session_url(session.id, "/bill")).status_code == 200
    assert client.get(_session_url(999999, "/bill")).status_code == 404


# Verifies payment persistence, request resolution, and session closure.
def test_register_payment_closes_session_and_resolves_payment_request(
    client,
    db_session,
    login_as,
    make_staff,
    make_session,
    make_guest,
    make_buffet,
    make_service_request,
    service_request_statuses,
):
    waiter = make_staff("Waiter")
    buffet = make_buffet(price="25.00")
    session = make_session(waiter=waiter)
    make_guest(session=session, buffet=buffet)
    request = make_service_request(
        session=session,
        type_alias="payment_request",
    )
    login_as(waiter)

    response = client.post(
        _session_url(session.id, "/payment"),
        json={"method": " Card ", "tip_amount": "2.00", "waste_count": 1},
    )

    assert response.status_code == 200
    assert response.json()["amount_paid"] == "33.00"
    assert response.json()["method"] == "card"
    db_session.refresh(session)
    db_session.refresh(request)
    payment = db_session.query(Payment).filter(Payment.session_id == session.id).one()
    assert session.is_active is False
    assert session.end_time is not None
    assert payment.amount_paid == Decimal("33.00")
    assert request.status_id == service_request_statuses["Resolved"].id
    assert request.resolved_at is not None


# Verifies that unresolved kitchen items prevent payment and session closure.
def test_register_payment_rejects_unresolved_kitchen_items(
    client,
    db_session,
    login_as,
    make_staff,
    make_session,
    make_guest,
    make_order,
    make_order_item,
    order_item_statuses,
    service_request_statuses,
    service_request_types,
):
    waiter = make_staff("Waiter")
    session = make_session(waiter=waiter)
    guest = make_guest(session=session)
    order = make_order(guest=guest)
    make_order_item(order=order, status_name="Ready")
    login_as(waiter)

    response = client.post(
        _session_url(session.id, "/payment"),
        json={"method": "cash"},
    )

    assert response.status_code == 409
    db_session.refresh(session)
    assert session.is_active is True
    assert db_session.query(Payment).filter(Payment.session_id == session.id).first() is None


# Verifies payment authorization, validation, missing sessions, and duplicate closes.
def test_register_payment_rejects_invalid_or_repeated_payment(
    client,
    login_as,
    make_staff,
    make_session,
    service_request_statuses,
    service_request_types,
):
    owner = make_staff("Waiter")
    other = make_staff("Waiter")
    session = make_session(waiter=owner)

    login_as(other)
    assert client.post(
        _session_url(session.id, "/payment"), json={"method": "cash"}
    ).status_code == 403

    login_as(owner)
    assert client.post(
        _session_url(session.id, "/payment"), json={"method": ""}
    ).status_code == 422
    assert client.post(
        _session_url(session.id, "/payment"),
        json={"method": "cash", "tip_amount": -1},
    ).status_code == 422
    assert client.post(
        _session_url(999999, "/payment"), json={"method": "cash"}
    ).status_code == 404

    assert client.post(
        _session_url(session.id, "/payment"), json={"method": "cash"}
    ).status_code == 200
    assert client.post(
        _session_url(session.id, "/payment"), json={"method": "cash"}
    ).status_code == 409
