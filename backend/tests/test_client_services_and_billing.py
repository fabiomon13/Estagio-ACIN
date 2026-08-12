from decimal import Decimal

from app.models.buffet_item import BuffetItem
from app.models.payment import Payment
from app.models.service_request import ServiceRequest
from app.models.service_request_status import ServiceRequestStatus
from app.models.service_request_type import ServiceRequestType
from app.modules.client.services.billing import calculate_guest_extras_total


TOKEN = "service-device-token-that-is-long-enough-0001"


def _context(make_staff, make_table, make_session, make_guest, *, buffet=None):
    waiter = make_staff("Waiter")
    table = make_table()
    session = make_session(table, num_clients=2, waiter=waiter)
    guest = make_guest(session=session, device_token=TOKEN, buffet=buffet)
    return table, session, guest


def _base(table):
    return f"/api/client/tables/{table.public_code}"


def _headers(token=TOKEN):
    return {"X-Device-Token": token}


def _request_reference_data(db_session):
    pending = ServiceRequestStatus(name="Pending test", alias="pending")
    cancelled = ServiceRequestStatus(name="Cancelled test", alias="cancelled")
    request_type = ServiceRequestType(name="Call waiter test", alias="call-waiter-test")
    db_session.add_all([pending, cancelled, request_type])
    db_session.commit()
    return pending, cancelled, request_type


# Verifies creation, listing, duplicate prevention, and cancellation of requests.
def test_service_request_lifecycle_and_duplicate_guard(
    client, db_session, make_staff, make_table, make_session, make_guest, monkeypatch
):
    table, session, _guest = _context(make_staff, make_table, make_session, make_guest)
    _pending, _cancelled, request_type = _request_reference_data(db_session)
    events = []
    monkeypatch.setattr(
        "app.modules.client.routes.service_requests.publish_session_event",
        lambda *args: events.append(args),
    )
    url = _base(table) + "/service-requests"

    assert client.post(url, json={"type": "unknown"}, headers=_headers()).status_code == 422
    created = client.post(url, json={"type": request_type.alias}, headers=_headers())
    assert created.status_code == 201
    assert created.json()["request_type"]["alias"] == request_type.alias
    assert client.post(url, json={"type": request_type.alias}, headers=_headers()).status_code == 409
    assert len(client.get(url, headers=_headers()).json()) == 1

    cancelled = client.patch(url + f"/{created.json()['id']}/cancel", headers=_headers())
    assert cancelled.status_code == 204
    assert events[-1] == (session.id, "service_requests.changed")
    assert client.patch(url + f"/{created.json()['id']}/cancel", headers=_headers()).status_code == 409


# Verifies that service requests cannot be cancelled from another session.
def test_cannot_cancel_another_sessions_request(
    client, db_session, make_staff, make_table, make_session, make_guest
):
    table, _session, _guest = _context(make_staff, make_table, make_session, make_guest)
    pending, _cancelled, request_type = _request_reference_data(db_session)
    _other_table, other_session, _other_guest = _context(
        make_staff, make_table, make_session, make_guest
    )
    service_request = ServiceRequest(
        session_id=other_session.id, status_id=pending.id, type_id=request_type.id
    )
    db_session.add(service_request)
    db_session.commit()

    response = client.patch(
        _base(table) + f"/service-requests/{service_request.id}/cancel", headers=_headers()
    )
    assert response.status_code == 404


# Verifies that the bill combines every charge without billing buffet items twice.
def test_bill_combines_buffet_extras_waste_and_tip(
    client, db_session, order_item_statuses, make_staff, make_table, make_session,
    make_guest, make_buffet, make_menu_item, make_order, make_order_item
):
    buffet = make_buffet(price="25.00")
    table, session, guest = _context(
        make_staff, make_table, make_session, make_guest, buffet=buffet
    )
    included = make_menu_item()
    extra = make_menu_item()
    db_session.add(BuffetItem(buffet_id=buffet.id, menu_item_id=included.id))
    order = make_order(guest=guest)
    make_order_item(order=order, menu_item=included, status_name="Served")
    extra_item = make_order_item(order=order, menu_item=extra, status_name="Served")
    extra_item.quantity = 2
    extra_item.unit_price_at_order = Decimal("7.50")
    payment = Payment(
        session_id=session.id,
        amount_paid=Decimal("50.00"),
        tip_amount=Decimal("2.00"),
        waste_count=1,
        method="card",
    )
    db_session.add(payment)
    db_session.commit()

    response = client.get(_base(table) + "/bill", headers=_headers())
    assert response.status_code == 200
    bill = response.json()
    assert bill["buffet_total"] == "25.00"
    assert bill["extras_total"] == "15.00"
    assert bill["waste_total"] == "6.00"
    assert bill["tip_amount"] == "2.00"
    assert bill["total"] == "48.00"
    assert bill["is_paid"] is True


# Verifies that cancelled and returned items are excluded from billable extras.
def test_billing_excludes_cancelled_and_returned_items(
    db_session, order_item_statuses, make_guest, make_order, make_order_item, make_menu_item
):
    guest = make_guest()
    order = make_order(guest=guest)
    for status in ("Cancelled", "Returned"):
        make_order_item(order=order, menu_item=make_menu_item(), status_name=status)

    assert calculate_guest_extras_total(db_session, guest.id) == Decimal("0")
