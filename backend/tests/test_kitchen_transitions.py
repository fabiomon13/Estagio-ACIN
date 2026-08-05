# Integration tests for update_item_status.

import pytest
from fastapi import HTTPException

from app.modules.kitchen import service


def test_pending_to_preparing_succeeds(
    db_session,
    order_item_statuses,
    make_order_item,
):
    item = make_order_item(status_name="Pending")

    updated = service.update_item_status(
        db_session,
        item.id,
        "Preparing",
    )

    assert updated.status == "Preparing"


def test_preparing_to_ready_succeeds(
    db_session,
    order_item_statuses,
    make_order_item,
):
    item = make_order_item(status_name="Preparing")

    updated = service.update_item_status(
        db_session,
        item.id,
        "Ready",
    )

    assert updated.status == "Ready"


# Reject invalid status transitions.
def test_invalid_transition_raises_409(
    db_session,
    order_item_statuses,
    make_order_item,
):
    item = make_order_item(status_name="Ready")

    with pytest.raises(HTTPException) as exc_info:
        service.update_item_status(
            db_session,
            item.id,
            "Preparing",
        )

    assert exc_info.value.status_code == 409


# Reject repeated status updates.
def test_repeated_transition_raises_409_not_silent_success(
    db_session,
    order_item_statuses,
    make_order_item,
):
    item = make_order_item(status_name="Preparing")

    service.update_item_status(
        db_session,
        item.id,
        "Ready",
    )

    with pytest.raises(HTTPException) as exc_info:
        service.update_item_status(
            db_session,
            item.id,
            "Ready",
        )

    assert exc_info.value.status_code == 409


def test_missing_item_raises_404(
    db_session,
    order_item_statuses,
):
    with pytest.raises(HTTPException) as exc_info:
        service.update_item_status(
            db_session,
            999999,
            "Preparing",
        )

    assert exc_info.value.status_code == 404


def test_broadcasts_the_active_tickets_after_a_successful_transition(
    db_session,
    order_item_statuses,
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

    item = make_order_item(status_name="Pending")

    service.update_item_status(db_session, item.id, "Preparing")

    assert len(broadcasts) == 1
    topic, message = broadcasts[0]
    assert topic == "kitchen"
    assert "tickets" in message
    assert any(
        order_item["order_item_id"] == item.id
        for ticket in message["tickets"]
        for order_item in ticket["items"]
    )


def test_does_not_broadcast_on_a_failed_transition(
    db_session,
    order_item_statuses,
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

    item = make_order_item(status_name="Ready")  # Ready has no valid next transition

    with pytest.raises(HTTPException):
        service.update_item_status(db_session, item.id, "Preparing")

    assert broadcasts == []