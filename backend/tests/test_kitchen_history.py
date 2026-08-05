# Tests for the Kitchen History endpoints -- GET /kitchen/history,
# GET /kitchen/history/summary, GET /kitchen/history/filters.

from datetime import datetime, timedelta, timezone


def _set_updated_at(db_session, item, when: datetime) -> None:
    """make_order_item can't set updated_at directly (it's a server-managed
    column) -- assign it after creation and commit again. SQLAlchemy's
    onupdate=func.now() only fills in a value when the column isn't
    otherwise explicitly set, so this explicit assignment wins."""
    item.updated_at = when
    db_session.commit()


def _make_dish_at_table(db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item, *, table_number, station=None, status_name="Served", when):
    table = make_table()
    table.table_number = table_number
    db_session.commit()
    dining_session = make_session(table=table)
    guest = make_guest(session=dining_session)
    order = make_order(guest=guest)
    menu_item = make_menu_item(station=station)
    item = make_order_item(order=order, menu_item=menu_item, status_name=status_name)
    _set_updated_at(db_session, item, when)
    return item, menu_item, table


def test_returns_items_within_the_date_range(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    today = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    yesterday = today - timedelta(days=1)

    item_today, menu_item, _ = _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=1, when=today,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=2, when=yesterday,
    )

    response = client.get("/api/kitchen/history", params={"date_from": "2026-08-04"})

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == 1
    assert [row["order_item_id"] for row in body["items"]] == [item_today.id]


def test_filters_by_status_table_dish_and_station(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    from app.models.station import Station

    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    station = Station(name="Grill Test", alias="grill-test")
    db_session.add(station)
    db_session.commit()

    served_item, served_dish, served_table = _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=5, station=station, status_name="Served", when=when,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=6, status_name="Cancelled", when=when,
    )

    response = client.get(
        "/api/kitchen/history",
        params={
            "date_from": "2026-08-04",
            "status": "Served",
            "table_number": 5,
            "item_id": served_dish.id,
            "station_id": station.id,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert [row["order_item_id"] for row in body["items"]] == [served_item.id]


def test_station_filter_falls_back_to_the_dish_category_default_station(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    """A dish with no station of its own uses its category's default_station
    (MenuItem.effective_station) -- the history filter has to replicate that
    same fallback at the SQL level, not just filter on MenuItem.station_id."""
    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)

    # make_menu_item(has_own_station=False) creates a fresh Station for the
    # dish's Category.default_station -- read it back off the dish.
    item, dish, _ = _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item,
        lambda **kwargs: make_menu_item(has_own_station=False, **kwargs),
        table_number=7, when=when,
    )
    category_default_station_id = dish.category.default_station_id

    response = client.get(
        "/api/kitchen/history",
        params={"date_from": "2026-08-04", "station_id": category_default_station_id},
    )

    assert response.status_code == 200
    assert [row["order_item_id"] for row in response.json()["items"]] == [item.id]


def test_paginates_with_limit_and_offset(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    for i in range(3):
        _make_dish_at_table(
            db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
            table_number=10 + i, when=when + timedelta(minutes=i),
        )

    response = client.get(
        "/api/kitchen/history",
        params={"date_from": "2026-08-04", "limit": 2, "offset": 1},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == 3
    assert len(body["items"]) == 2


def test_rejects_date_to_before_date_from(client, login_as, make_staff, staff_roles):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    response = client.get(
        "/api/kitchen/history",
        params={"date_from": "2026-08-04", "date_to": "2026-08-01"},
    )

    assert response.status_code == 422


def test_requires_chef_or_admin_role(client, login_as, make_staff, staff_roles):
    waiter = make_staff(role_name="Waiter")
    login_as(waiter)

    response = client.get("/api/kitchen/history", params={"date_from": "2026-08-04"})

    assert response.status_code == 403


def test_summary_counts_every_status_including_zero(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=20, status_name="Served", when=when,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=21, status_name="Served", when=when,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=22, status_name="Cancelled", when=when,
    )

    response = client.get("/api/kitchen/history/summary", params={"date_from": "2026-08-04"})

    assert response.status_code == 200
    counts = response.json()["counts"]
    assert counts["Served"] == 2
    assert counts["Cancelled"] == 1
    assert counts["Returned"] == 0  # present, even though nothing matched


def test_summary_ignores_a_status_query_param_if_sent(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    """/history/summary's filters model (KitchenHistoryBaseFilters) has no
    `status` field at all, so FastAPI/Pydantic simply ignores an unknown
    query param rather than erroring -- this test documents that on purpose."""
    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=23, status_name="Served", when=when,
    )

    response = client.get(
        "/api/kitchen/history/summary",
        params={"date_from": "2026-08-04", "status": "Cancelled"},
    )

    assert response.status_code == 200
    assert response.json()["counts"]["Served"] == 1


def test_summary_respects_table_filter(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=30, status_name="Served", when=when,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=31, status_name="Served", when=when,
    )

    response = client.get(
        "/api/kitchen/history/summary",
        params={"date_from": "2026-08-04", "table_number": 30},
    )

    assert response.status_code == 200
    assert response.json()["counts"]["Served"] == 1


def test_summary_reports_the_busiest_station(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    from app.models.station import Station

    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    grill = Station(name="Grill Test", alias="grill-test-busiest")
    wok = Station(name="Wok Test", alias="wok-test-busiest")
    db_session.add_all([grill, wok])
    db_session.commit()

    # Grill gets 2 items, Wok gets 1 -- Grill should win.
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=40, station=grill, when=when,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=41, station=grill, when=when,
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=42, station=wok, when=when,
    )

    response = client.get("/api/kitchen/history/summary", params={"date_from": "2026-08-04"})

    assert response.status_code == 200
    assert response.json()["busiest_station"] == "Grill Test"


def test_summary_busiest_station_falls_back_to_category_default_station(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    when = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
    _, dish, _ = _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item,
        lambda **kwargs: make_menu_item(has_own_station=False, **kwargs),
        table_number=43, when=when,
    )

    response = client.get("/api/kitchen/history/summary", params={"date_from": "2026-08-04"})

    assert response.status_code == 200
    assert response.json()["busiest_station"] == dish.category.default_station.name


def test_summary_reports_the_peak_hour(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    # 14h gets 2 items, 9h gets 1 -- 14 should win.
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=50, when=datetime(2026, 8, 4, 14, 10, tzinfo=timezone.utc),
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=51, when=datetime(2026, 8, 4, 14, 45, tzinfo=timezone.utc),
    )
    _make_dish_at_table(
        db_session, make_table, make_session, make_guest, make_order, make_order_item, make_menu_item,
        table_number=52, when=datetime(2026, 8, 4, 9, 0, tzinfo=timezone.utc),
    )

    response = client.get("/api/kitchen/history/summary", params={"date_from": "2026-08-04"})

    assert response.status_code == 200
    assert response.json()["peak_hour"] == 14


def test_summary_busiest_station_and_peak_hour_are_none_without_matches(
    client, login_as, make_staff, staff_roles,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    response = client.get("/api/kitchen/history/summary", params={"date_from": "2026-08-04"})

    assert response.status_code == 200
    body = response.json()
    assert body["busiest_station"] is None
    assert body["peak_hour"] is None


def test_filter_options_returns_the_full_dish_and_station_catalog(
    client, login_as, make_staff, db_session,
    staff_roles, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    dish = make_menu_item()

    response = client.get("/api/kitchen/history/filters")

    assert response.status_code == 200
    body = response.json()
    assert any(row["id"] == dish.id and row["name"] == dish.name for row in body["items"])
    assert any(row["id"] == dish.station_id and row["name"] == dish.station.name for row in body["stations"])
