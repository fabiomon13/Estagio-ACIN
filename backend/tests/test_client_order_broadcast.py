# Regression test: creating an order must push a fresh board snapshot to
# any connected kitchen client, the same way a status transition does.

import uuid

from app.modules.client.routes.orders import create_order
from app.modules.client.schemas import OrderCreate, OrderItemCreate


def test_creating_an_order_broadcasts_the_active_tickets(
    db_session,
    order_item_statuses,
    make_guest,
    make_menu_item,
    monkeypatch,
):
    from app.modules.kitchen import websocket as kitchen_ws

    broadcasts: list[tuple[str, dict]] = []
    monkeypatch.setattr(
        kitchen_ws.connection_manager,
        "broadcast",
        lambda topic, message: broadcasts.append((topic, message)),
    )

    guest = make_guest()
    menu_item = make_menu_item()
    order_data = OrderCreate(
        client_request_id=uuid.uuid4(),
        items=[OrderItemCreate(item_id=menu_item.id, quantity=1)],
    )

    create_order(order_data=order_data, guest=guest, db=db_session)

    # Other topics (e.g. a client-facing notification) may also broadcast on
    # order creation -- only the kitchen board's own broadcast is this
    # test's concern, so pick it out instead of assuming it's the only one.
    kitchen_broadcasts = [(topic, message) for topic, message in broadcasts if topic == "kitchen"]
    assert len(kitchen_broadcasts) == 1
    _topic, message = kitchen_broadcasts[0]
    assert "tickets" in message
    assert any(
        order_item["menu_item_name"] == menu_item.name
        for ticket in message["tickets"]
        for order_item in ticket["items"]
    )


def test_a_duplicate_order_request_does_not_broadcast_again(
    db_session,
    order_item_statuses,
    make_guest,
    make_menu_item,
    monkeypatch,
):
    from app.modules.kitchen import websocket as kitchen_ws

    broadcasts: list[tuple[str, dict]] = []
    monkeypatch.setattr(
        kitchen_ws.connection_manager,
        "broadcast",
        lambda topic, message: broadcasts.append((topic, message)),
    )

    guest = make_guest()
    menu_item = make_menu_item()
    order_data = OrderCreate(
        client_request_id=uuid.uuid4(),
        items=[OrderItemCreate(item_id=menu_item.id, quantity=1)],
    )

    create_order(order_data=order_data, guest=guest, db=db_session)
    create_order(order_data=order_data, guest=guest, db=db_session)  # retry, same client_request_id

    kitchen_broadcasts = [topic for topic, _message in broadcasts if topic == "kitchen"]
    assert len(kitchen_broadcasts) == 1
