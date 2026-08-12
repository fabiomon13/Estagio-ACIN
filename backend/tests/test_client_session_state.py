from decimal import Decimal

from app.models.payment import Payment
from app.modules.client.security import hash_device_token


DEVICE_TOKEN = "client-session-state-device-token-123456"


def _state_path(table, dining_session) -> str:
    return (
        f"/api/client/tables/{table.public_code}"
        f"/sessions/{dining_session.id}/state"
    )


def _authorize_guest(db_session, guest) -> None:
    guest.device_token_hash = hash_device_token(DEVICE_TOKEN)
    guest.dining_session.is_approved = False
    db_session.commit()


def test_get_session_state_reports_active(
    client, db_session, make_table, make_session, make_guest
):
    table = make_table()
    dining_session = make_session(table)
    guest = make_guest(dining_session)
    _authorize_guest(db_session, guest)

    response = client.get(
        _state_path(table, dining_session),
        headers={"X-Device-Token": DEVICE_TOKEN},
    )

    assert response.status_code == 200
    assert response.json()["session"]["id"] == dining_session.id
    assert response.json()["status"] == "active"


def test_get_session_state_reports_completed_after_payment(
    client, db_session, make_table, make_session, make_guest
):
    table = make_table()
    dining_session = make_session(table)
    guest = make_guest(dining_session)
    _authorize_guest(db_session, guest)
    dining_session.is_active = False
    db_session.add(
        Payment(
            session_id=dining_session.id,
            amount_paid=Decimal("10.00"),
            tip_amount=Decimal("0.00"),
            method="cash",
            waste_count=0,
        )
    )
    db_session.commit()

    response = client.get(
        _state_path(table, dining_session),
        headers={"X-Device-Token": DEVICE_TOKEN},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_get_session_state_reports_closed_without_payment(
    client, db_session, make_table, make_session, make_guest
):
    table = make_table()
    dining_session = make_session(table)
    guest = make_guest(dining_session)
    _authorize_guest(db_session, guest)
    dining_session.is_active = False
    db_session.commit()

    response = client.get(
        _state_path(table, dining_session),
        headers={"X-Device-Token": DEVICE_TOKEN},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "closed"


def test_get_session_state_rejects_another_device(
    client, db_session, make_table, make_session, make_guest
):
    table = make_table()
    dining_session = make_session(table)
    guest = make_guest(dining_session)
    _authorize_guest(db_session, guest)

    response = client.get(
        _state_path(table, dining_session),
        headers={"X-Device-Token": "another-device-token-with-enough-length-123"},
    )

    assert response.status_code == 401
