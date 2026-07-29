# Kitchen Backend — Tickets & Item Status

This document explains the Kitchen module's backend: what the two endpoints do, how a "ticket" is defined, and how to run and extend the test suite. If you're building the kitchen frontend, or adding a related endpoint (e.g. the waiter's "mark as served" or the client's "cancel item"), read this first.

**Scope:** this is the first of several planned sub-projects for the Kitchen Display board. It covers reading active tickets and advancing an item through `Pending → Preparing → Ready`. It does **not** cover: the frontend UI, real-time updates (v1 uses polling, built on top of this later), cancelling an item (client/waiter side), or marking an item `Served` (waiter side).

## The short version

- A **ticket** is one `Order` row — one guest's one round at a table. Guests are never merged, even if they share a table and round number.
- A ticket is **active** (shows up on the board) while it has at least one item in `Pending`, `Preparing`, or `Ready`. Once every item is terminal (`Served`, `Cancelled`, or `Returned`), the ticket disappears.
- A ticket's response always includes **every** item it has, regardless of status — never just the active ones. Terminal items (e.g. already `Served`) still show up, so the kitchen sees the full round.
- Kitchen can only move an item `Pending → Preparing` or `Preparing → Ready`. Nothing else — not cancelling, not marking `Served`.
- Both endpoints require the `Chef` role (Admin passes automatically — see `docs/auth.md`).

## Endpoints

### `GET /api/kitchen/tickets`

Returns every active ticket, oldest first, each with all of its items (also oldest first).

```jsonc
[
  {
    "order_id": 1042,
    "table_number": 6,
    "guest_number": 2,
    "round_number": 1,
    "created_at": "2026-07-27T12:03:00Z",
    "items": [
      {
        "order_item_id": 501,
        "menu_item_name": "Dragon Roll",
        "quantity": 1,
        "notes": "Extra spicy",
        "tags": ["Alergénio: crustáceos"],
        "station_id": 3,
        "station": "Sushi Bar",
        "status": "Pending",
        "created_at": "2026-07-27T12:03:00Z"
      }
    ]
  }
]
```

Field notes:

| Field | Notes |
|---|---|
| `guest_number` | **Derived, not stored.** The 1st guest to join the table's dining session is `1`, the 2nd is `2`, etc. Display-only — don't use it as a stable identifier elsewhere. |
| `tags` | Always an array; `[]` when the dish has no tags, never `null`. |
| `notes` | Free text on the order item; can be `null`. |
| `station_id` / `station` | Never `null` — every menu item requires a station. `station_id` exists so the frontend's station filter doesn't key off a renamable display string. |
| `created_at` (on an item) | Assumed to be the moment the item arrived at the kitchen (order submission time). This holds as long as `OrderItem` rows are only created at submission — true today, but worth re-checking once the client module's order-creation endpoint exists. |

No query parameters — station filtering and table/item search are frontend-only concerns over this full list (see the design doc for why).

### `PATCH /api/kitchen/order-items/{order_item_id}/status`

```jsonc
// Request
{ "status": "Preparing" }
```

Only `"Preparing"` or `"Ready"` are accepted values; anything else (including real status names like `"Served"`) fails validation. Returns the updated item (same shape as an item above) on success.

| Situation | Status |
|---|---|
| No/invalid session cookie | `401` |
| Logged in, not Chef or Admin | `403` |
| `order_item_id` doesn't exist | `404` |
| `status` isn't `"Preparing"`/`"Ready"` | `422` |
| Valid `status`, but not a valid transition from the item's current one | `409` |

The underlying update is done with a conditional `UPDATE ... WHERE status_id = <the status we just read>` rather than a plain read-then-write, so two chefs acting on the same item at nearly the same time can't silently clobber each other — the second request gets `409` instead of succeeding.

## File map

| File | What it's for |
|---|---|
| `app/modules/kitchen/schemas.py` | Pydantic request/response shapes (`KitchenTicketOut`, `KitchenOrderItemOut`, `KitchenStatusUpdateRequest`). |
| `app/modules/kitchen/service.py` | All the query/business logic — `get_active_tickets()` and `update_item_status()`. No FastAPI/HTTP concerns here; takes a plain SQLAlchemy `Session`, so it's testable without going through the API. |
| `app/modules/kitchen/router.py` | Turns the service functions into `GET`/`PATCH` endpoints, applies the `Chef` role gate. |
| `app/api/router.py` | Mounts the kitchen router at `/api/kitchen`. |

## Testing

This module came with the project's first backend test suite (`backend/tests/`). Key things to know before touching it:

- **Needs a dedicated test database.** Set `TEST_DATABASE_URL` in `backend/.env` to a Postgres database that is *not* the one `DATABASE_URL` points at (e.g. a separate Neon branch) — the suite creates and drops every table on it. See `backend/.env.example`.
- Every test that touches the database gets a `db_session` fixture (from `backend/tests/conftest.py`) whose changes are always rolled back at the end of the test, even if the code under test calls `commit()` — so tests never leak data into each other.
- `client` (also in `conftest.py`) is a fake HTTP client wired to that same session — use it for tests that need to go through real routing/auth, not just the service layer.
- A handful of factory fixtures (`make_staff`, `make_order_item`, etc.) build realistic test data on demand — see the fixtures section of `conftest.py` for the full list.

Run the suite:

```bash
cd backend
source .venv/bin/activate
pytest -v
```

Test files, one per concern:

| File | Covers |
|---|---|
| `tests/test_health.py` | Smoke test — proves the test DB/client plumbing works at all. |
| `tests/test_kitchen_schemas.py` | The `Literal["Preparing", "Ready"]` validation on the PATCH request body. |
| `tests/test_kitchen_service.py` | `get_active_tickets()` — active/inactive tickets, item visibility, `guest_number`, ordering. |
| `tests/test_kitchen_transitions.py` | `update_item_status()` — valid transitions, invalid ones, the no-silent-double-apply guarantee, missing items. |
| `tests/test_kitchen_router.py` | Full HTTP-level checks — role gating (`Chef`/`Admin`/`Waiter`/unauthenticated), status codes end to end. |

## What's out of scope here (see the roadmap in the design doc)

- WebSockets (v1 is polling from the frontend; these endpoint contracts don't change when that's added later).
- Cancelling an item — belongs to the client/waiter side. An item can only be cancelled while still `Pending`.
- Marking an item `Served` — belongs to the waiter side.
- A `Returned → Preparing` "send it back to the kitchen" flow — `Returned` is treated as terminal for now; nothing currently defines what should happen to a returned dish.
- Everything frontend: the ticket board UI, elapsed-time highlighting, station filter, search, notifications, sound settings.
