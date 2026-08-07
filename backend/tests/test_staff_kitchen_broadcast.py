# Staff actions that change an order_item's status must push a fresh kitchen
# board snapshot, the same way kitchen's own transitions already do -- see
# test_kitchen_transitions.py's version of this test.

from app.modules.staff import staff_service


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

    assert len(broadcasts) == 1
    topic, message = broadcasts[0]
    assert topic == "kitchen"
    assert "tickets" in message
