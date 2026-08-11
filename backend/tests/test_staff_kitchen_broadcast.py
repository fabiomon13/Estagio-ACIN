# Staff actions that change an order_item's status must push a fresh kitchen
# board snapshot, the same way kitchen's own transitions already do -- see
# test_kitchen_transitions.py's version of this test.

import pytest
from fastapi import HTTPException

from app.models.service_request_status import ServiceRequestStatus
from app.models.service_request_type import ServiceRequestType
from app.modules.staff import staff_service
from app.modules.staff.staff_contract import StaffPaymentCreate


def test_marking_an_item_as_served_broadcasts_the_updated_kitchen_board(
    db_session,
    order_item_statuses,
    make_staff,
    make_order_item,
    monkeypatch,
):
    from app.modules.kitchen import websocket as kitchen_ws

    broadcasts: list[tuple[str, dict]] = []
    monkeypatch.setattr(
        kitchen_ws.connection_manager,
        "broadcast",
        lambda topic, message: broadcasts.append((topic, message)),
    )

    admin = make_staff(role_name="Admin")
    item = make_order_item(status_name="Ready")

    staff_service.mark_item_as_served(db_session, item.id, admin)

    # Other topics (e.g. a client-facing notification) may also broadcast on
    # this transition -- only the kitchen board's own broadcast is this
    # test's concern, so pick it out instead of assuming it's the only one.
    kitchen_broadcasts = [(topic, message) for topic, message in broadcasts if topic == "kitchen"]
    assert len(kitchen_broadcasts) == 1
    _topic, message = kitchen_broadcasts[0]
    assert "tickets" in message


def test_closing_a_paid_session_is_rejected_while_kitchen_items_are_unresolved(
    db_session,
    order_item_statuses,
    make_staff,
    make_table,
    make_session,
    make_guest,
    make_order,
    make_order_item,
):
    """Regression test: a table used to be payable/closable while the
    kitchen was still working on one of its items (Pending/Preparing/Ready).
    That either stranded the item on the kitchen board forever (session
    gone, nothing left to serve it to) or -- if auto-cancelled -- charged
    the guest for a dish that quietly never arrived. Closing must now be
    rejected until the waiter explicitly serves or cancels it."""
    db_session.add_all(
        [
            ServiceRequestType(name="Payment Request", alias="payment_request"),
            ServiceRequestStatus(name="Resolved", alias="resolved"),
        ]
    )
    db_session.commit()

    admin = make_staff(role_name="Admin")
    table = make_table()
    session = make_session(table)
    guest = make_guest(session=session)
    order = make_order(guest=guest)
    item = make_order_item(order=order, status_name="Ready")

    with pytest.raises(HTTPException) as exc_info:
        staff_service.register_payment_and_close_session(
            db_session,
            session.id,
            StaffPaymentCreate(method="cash"),
            admin,
        )

    assert exc_info.value.status_code == 409

    db_session.refresh(item)
    db_session.refresh(session)

    # Nothing should have changed -- no silent side effects on a rejected close.
    assert item.status_id == order_item_statuses["Ready"].id
    assert session.is_active is True
