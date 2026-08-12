from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.payment import Payment

PAYMENT_HISTORY_URL = "/api/staff/payments"


def _make_payment(db_session, session, *, method="cash", amount="25.00", paid_at=None):
    payment = Payment(
        session_id=session.id,
        amount_paid=Decimal(amount),
        tip_amount=Decimal("0.00"),
        method=method,
        waste_count=0,
        paid_at=paid_at or datetime.now(timezone.utc),
    )
    db_session.add(payment)
    db_session.commit()
    return payment


def test_payment_history_requires_authentication(client):
    response = client.get(PAYMENT_HISTORY_URL)
    assert response.status_code == 401


def test_non_admin_is_forbidden_from_payment_history(client, login_as, make_staff):
    login_as(make_staff("Waiter"))
    response = client.get(PAYMENT_HISTORY_URL)
    assert response.status_code == 403


def test_admin_sees_payments_most_recent_first(
    client, db_session, login_as, make_staff, make_session, make_table
):
    admin = make_staff("Admin")
    waiter = make_staff("Waiter")
    table = make_table()
    older_session = make_session(table=make_table(), waiter=waiter)
    newer_session = make_session(table=table, waiter=waiter)

    now = datetime.now(timezone.utc)
    _make_payment(db_session, older_session, amount="25.00", paid_at=now - timedelta(hours=2))
    _make_payment(db_session, newer_session, amount="40.50", paid_at=now)

    login_as(admin)
    response = client.get(PAYMENT_HISTORY_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == 2
    assert [item["amount_paid"] for item in body["items"]] == ["40.50", "25.00"]

    newest = body["items"][0]
    assert newest["table_number"] == table.table_number
    assert newest["waiter_name"] == waiter.name
    assert newest["method"] == "cash"
    assert newest["session_id"] == newer_session.id


def test_payment_history_filters_by_table_number(
    client, db_session, login_as, make_staff, make_session, make_table
):
    admin = make_staff("Admin")
    table_a = make_table()
    table_b = make_table()
    session_a = make_session(table=table_a)
    session_b = make_session(table=table_b)
    _make_payment(db_session, session_a)
    _make_payment(db_session, session_b)

    login_as(admin)
    response = client.get(PAYMENT_HISTORY_URL, params={"table_number": table_a.table_number})

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == 1
    assert body["items"][0]["session_id"] == session_a.id


def test_payment_history_filters_by_method(
    client, db_session, login_as, make_staff, make_session
):
    admin = make_staff("Admin")
    cash_session = make_session()
    card_session = make_session()
    _make_payment(db_session, cash_session, method="cash")
    _make_payment(db_session, card_session, method="card")

    login_as(admin)
    response = client.get(PAYMENT_HISTORY_URL, params={"method": "card"})

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == 1
    assert body["items"][0]["session_id"] == card_session.id


def test_payment_history_respects_pagination(
    client, db_session, login_as, make_staff, make_session
):
    admin = make_staff("Admin")
    now = datetime.now(timezone.utc)
    for i in range(3):
        _make_payment(db_session, make_session(), paid_at=now - timedelta(minutes=i))

    login_as(admin)
    response = client.get(PAYMENT_HISTORY_URL, params={"limit": 2, "offset": 1})

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == 3
    assert len(body["items"]) == 2
