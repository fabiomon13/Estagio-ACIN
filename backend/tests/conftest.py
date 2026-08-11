# Shared fixtures for backend tests.

import itertools
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401 -- registers every model on Base.metadata
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.dependencies import get_db as get_db_dependencies
from app.main import app
from app.models.category import Category
from app.models.buffet import Buffet
from app.models.dining_session import DiningSession
from app.models.guest import Guest
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_status import OrderItemStatus
from app.models.restaurant_table import RestaurantTable
from app.models.service_request import ServiceRequest
from app.models.service_request_status import ServiceRequestStatus
from app.models.service_request_type import ServiceRequestType
from app.models.staff import Staff
from app.models.staff_role import StaffRole
from app.models.station import Station
from app.modules.client.security import hash_device_token

# Require a separate test database.
if not settings.test_database_url:
    raise RuntimeError(
        "TEST_DATABASE_URL is not set. Add it to backend/.env, pointing at a "
        "dedicated test database (never the same one DATABASE_URL points at) "
    )

test_engine = create_engine(settings.test_database_url, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

# Generate unique test values.
_counter = itertools.count(1)


def _unique(prefix: str) -> str:
    return f"{prefix} {next(_counter)}"


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Create and remove the test schema."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Provide a rolled-back test session."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(session, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    """A fake HTTP client (FastAPI's TestClient) that runs requests against
    our real app; real routing, real auth, real request/response
    validation but wired to `db_session` instead of the real database."""

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db_dependencies] = _override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ---- Reference/lookup data -------------------------------------------
# These mirror what backend/app/db/seeds/*.py insert in a real environment.
# Tests need their own copies because the test database starts empty.


@pytest.fixture
def order_item_statuses(db_session) -> dict[str, OrderItemStatus]:
    """Create order item statuses."""
    names = ["Pending", "Preparing", "Ready", "Cancelled", "Served", "Returned"]
    statuses = {name: OrderItemStatus(name=name, alias=name.lower()) for name in names}
    db_session.add_all(statuses.values())
    db_session.commit()
    return statuses


@pytest.fixture
def staff_roles(db_session) -> dict[str, StaffRole]:
    """Create staff roles."""
    names = ["Admin", "Waiter", "Chef"]
    roles = {name: StaffRole(name=name, alias=name.lower()) for name in names}
    db_session.add_all(roles.values())
    db_session.commit()
    return roles


@pytest.fixture
def service_request_statuses(db_session) -> dict[str, ServiceRequestStatus]:
    """Create the service-request states used by staff workflows."""
    names = ["Pending", "Resolved", "Cancelled"]
    statuses = {
        name: ServiceRequestStatus(name=name, alias=name.lower())
        for name in names
    }
    db_session.add_all(statuses.values())
    db_session.commit()
    return statuses


@pytest.fixture
def service_request_types(db_session) -> dict[str, ServiceRequestType]:
    """Create the request types supported by the staff contract."""
    types = {
        "assistance": ServiceRequestType(
            name="Assistance",
            alias="assistance",
            is_high_priority=True,
        ),
        "payment_request": ServiceRequestType(
            name="Payment request",
            alias="payment_request",
            is_high_priority=False,
        ),
    }
    db_session.add_all(types.values())
    db_session.commit()
    return types


# ---- Factories ---------------------------------------------------------

@pytest.fixture
def make_staff(db_session, staff_roles):
    def _make(role_name: str = "Chef") -> Staff:
        staff = Staff(
            staff_role_id=staff_roles[role_name].id,
            name=_unique("Test Staff"),
            email=_unique("staff").replace(" ", "") + "@test.dev",
            password_hash=hash_password("irrelevant"),  # never checked in these tests
            is_active=True,
        )
        db_session.add(staff)
        db_session.commit()
        return staff

    return _make


@pytest.fixture
def login_as(client):
    """Authenticate as a staff member."""

    def _login(staff: Staff):
        token = create_access_token(staff.id)
        client.cookies.set("access_token", token)
        return client

    return _login


@pytest.fixture
def make_table(db_session):
    def _make() -> RestaurantTable:
        table = RestaurantTable(table_number=next(_counter), max_capacity=4)
        db_session.add(table)
        db_session.commit()
        return table

    return _make


@pytest.fixture
def make_session(db_session, make_table):
    def _make(
        table: RestaurantTable | None = None,
        *,
        num_clients: int = 1,
        is_active: bool = True,
        is_approved: bool = True,
        waiter: Staff | None = None,
    ) -> DiningSession:
        dining_session = DiningSession(
            table_id=(table or make_table()).id,
            waiter_id=waiter.id if waiter else None,
            num_clients=num_clients,
            is_active=is_active,
            is_approved=is_approved,
            approved_at=(datetime.now(timezone.utc) if is_approved and waiter else None),
        )
        db_session.add(dining_session)
        db_session.commit()
        return dining_session

    return _make


@pytest.fixture
def make_guest(db_session, make_session):
    def _make(
        session: DiningSession | None = None,
        created_at: datetime | None = None,
        device_token: str | None = None,
        buffet: Buffet | None = None,
    ) -> Guest:
        guest = Guest(
            session_id=(session or make_session()).id,
            device_token_hash=(
                hash_device_token(device_token)
                if device_token is not None
                else _unique("token")
            ),
            buffet_id=buffet.id if buffet else None,
            created_at=created_at or datetime.now(timezone.utc),
        )
        db_session.add(guest)
        db_session.commit()
        return guest

    return _make


@pytest.fixture
def make_buffet(db_session):
    def _make(*, price: str = "25.00", waste_charge: str = "6.00") -> Buffet:
        buffet = Buffet(
            name=_unique("Test Buffet"),
            alias=_unique("test-buffet").replace(" ", "-"),
            price=price,
            waste_charge=waste_charge,
        )
        db_session.add(buffet)
        db_session.commit()
        return buffet

    return _make


@pytest.fixture
def make_service_request(
    db_session,
    make_session,
    service_request_statuses,
    service_request_types,
):
    def _make(
        session: DiningSession | None = None,
        *,
        type_alias: str = "assistance",
        status_name: str = "Pending",
        resolved_at: datetime | None = None,
    ) -> ServiceRequest:
        request = ServiceRequest(
            session_id=(session or make_session()).id,
            type_id=service_request_types[type_alias].id,
            status_id=service_request_statuses[status_name].id,
            resolved_at=resolved_at,
        )
        db_session.add(request)
        db_session.commit()
        return request

    return _make


@pytest.fixture
def make_menu_item(db_session):
    """Create a menu item with required data."""

    def _make(station: Station | None = None, has_own_station: bool = True) -> MenuItem:
        if station is None:
            station = Station(name=_unique("Test Station"), alias=_unique("test-station"))
            db_session.add(station)
            db_session.commit()

        category = Category(
            name=_unique("Test Category"),
            alias=_unique("test-category"),
            default_station_id=station.id,
        )
        db_session.add(category)
        db_session.commit()

        menu_item = MenuItem(
            category_id=category.id,
            station_id=station.id if has_own_station else None,
            name=_unique("Test Dish"),
            alias=_unique("test-dish"),
            base_price=10,
            base_preparation_time=5,
        )
        db_session.add(menu_item)
        db_session.commit()
        return menu_item

    return _make


@pytest.fixture
def make_order(db_session, make_guest):
    def _make(
        guest: Guest | None = None,
        round_number: int = 1,
        created_at: datetime | None = None,
    ) -> Order:
        order = Order(
            guest_id=(guest or make_guest()).id,
            round_number=round_number,
            client_request_id=str(uuid.uuid4()),
            created_at=created_at or datetime.now(timezone.utc),
        )
        db_session.add(order)
        db_session.commit()
        return order

    return _make


@pytest.fixture
def make_order_item(db_session, order_item_statuses, make_order, make_menu_item):
    """Create an order item and required data."""

    def _make(
        order: Order | None = None,
        menu_item: MenuItem | None = None,
        status_name: str = "Pending",
        created_at: datetime | None = None,
        notes: str | None = None,
    ) -> OrderItem:
        item = OrderItem(
            order_id=(order or make_order()).id,
            item_id=(menu_item or make_menu_item()).id,
            status_id=order_item_statuses[status_name].id,
            quantity=1,
            notes=notes,
            unit_price=10,
            unit_price_at_order=10,
            created_at=created_at or datetime.now(timezone.utc),
        )
        db_session.add(item)
        db_session.commit()
        return item

    return _make
