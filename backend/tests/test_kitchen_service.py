# Integration tests for get_active_tickets using the test database.

from datetime import datetime, timedelta, timezone

from app.modules.kitchen import service


def test_ticket_with_pending_item_appears(
    db_session,
    order_item_statuses,
    make_order_item,
):
    make_order_item(status_name="Pending")

    tickets = service.get_active_tickets(db_session)

    assert len(tickets) == 1


# Active tickets include all their items.
def test_ticket_returns_all_items_regardless_of_status(
    db_session,
    order_item_statuses,
    make_order,
    make_order_item,
):
    order = make_order()
    make_order_item(order=order, status_name="Preparing")
    make_order_item(order=order, status_name="Served")

    tickets = service.get_active_tickets(db_session)

    assert len(tickets) == 1

    statuses = {
        item.status
        for item in tickets[0].items
    }

    assert statuses == {"Preparing", "Served"}


# Tickets with only terminal items are hidden.
def test_fully_served_ticket_disappears(
    db_session,
    order_item_statuses,
    make_order_item,
):
    make_order_item(status_name="Served")

    assert service.get_active_tickets(db_session) == []


def test_fully_cancelled_ticket_disappears(
    db_session,
    order_item_statuses,
    make_order_item,
):
    make_order_item(status_name="Cancelled")

    assert service.get_active_tickets(db_session) == []


def test_fully_returned_ticket_disappears(
    db_session,
    order_item_statuses,
    make_order_item,
):
    make_order_item(status_name="Returned")

    assert service.get_active_tickets(db_session) == []


# Guests are numbered by arrival order.
def test_guest_number_is_positional_within_session(
    db_session,
    order_item_statuses,
    make_session,
    make_guest,
    make_order,
    make_order_item,
):
    now = datetime.now(timezone.utc)
    session = make_session()

    first_guest = make_guest(
        session=session,
        created_at=now,
    )
    second_guest = make_guest(
        session=session,
        created_at=now + timedelta(seconds=10),
    )

    make_order_item(
        order=make_order(guest=first_guest),
        status_name="Pending",
    )
    make_order_item(
        order=make_order(guest=second_guest),
        status_name="Pending",
    )

    tickets = service.get_active_tickets(db_session)

    assert {
        ticket.guest_number
        for ticket in tickets
    } == {1, 2}


# Tickets are returned oldest first.
def test_tickets_ordered_oldest_first(
    db_session,
    order_item_statuses,
    make_order,
    make_order_item,
):
    now = datetime.now(timezone.utc)

    newer_order = make_order(created_at=now)
    older_order = make_order(
        created_at=now - timedelta(minutes=5),
    )

    make_order_item(
        order=newer_order,
        status_name="Pending",
    )
    make_order_item(
        order=older_order,
        status_name="Pending",
    )

    tickets = service.get_active_tickets(db_session)

    assert [
        ticket.order_id
        for ticket in tickets
    ] == [
        older_order.id,
        newer_order.id,
    ]


# An item with no station of its own inherits its category's default station.
def test_item_without_own_station_falls_back_to_category_default(
    db_session,
    order_item_statuses,
    make_menu_item,
    make_order_item,
):
    menu_item = make_menu_item(has_own_station=False)
    expected_station_name = menu_item.category.default_station.name

    make_order_item(menu_item=menu_item, status_name="Pending")

    tickets = service.get_active_tickets(db_session)

    assert tickets[0].items[0].station == expected_station_name


# Items inside a ticket are returned oldest first.
def test_items_within_ticket_ordered_oldest_first(
    db_session,
    order_item_statuses,
    make_order,
    make_order_item,
):
    order = make_order()
    now = datetime.now(timezone.utc)

    newer_item = make_order_item(
        order=order,
        status_name="Pending",
        created_at=now,
    )
    older_item = make_order_item(
        order=order,
        status_name="Pending",
        created_at=now - timedelta(minutes=5),
    )

    tickets = service.get_active_tickets(db_session)

    assert [
        item.order_item_id
        for item in tickets[0].items
    ] == [
        older_item.id,
        newer_item.id,
    ]