# Staff Authentication & Authorization

This document explains how staff login and role-based permissions work in this project: the flow, the key files on both sides, and — most importantly — how to use the existing pieces when you add new protected endpoints or pages. If you're building a feature that needs "only an Admin can do this" or "show who's logged in," read this first instead of rolling your own check.

Design rationale and the full decision history live in `backend/docs/superpowers/specs/2026-07-23-staff-auth-design.md` (and the implementation plan next to it). This doc is the practical "how do I use this" reference; that one is the "why was it built this way" reference.

**Scope:** this covers **Staff** accounts only (Admin, Waiter, Chef — people who log in with email/password). Guests (customers at a table, identified by a QR-code device token) use a completely different, not-yet-built mechanism and are out of scope here.

## The short version

- Staff log in with email + password. The backend sets an `httpOnly` cookie holding a JWT.
- The JWT carries **only the staff's id** — never their role, never their active/inactive status. Every request re-reads both from the database.
- Roles are `admin`, `waiter`, `chef`. **Admin can access everything**, regardless of what a route or page declares.
- Backend routes are protected with a `require_role(...)` dependency. Frontend pages are protected with a `<ProtectedRoute roles={[...]}>` wrapper.

## Why the role isn't inside the token

This is the one decision worth understanding before touching anything else here.

If the JWT carried the role, a staff member's access would be frozen at whatever it was when they logged in — for up to 8 hours (the token's lifetime), even if an Admin deactivates their account or changes their role five minutes later. There would be no way to revoke access without also invalidating the token itself.

Instead, the token only proves *who* someone is (their staff id). On every single request, the backend loads that `Staff` row fresh and checks its **current** role and **current** `is_active` value. Deactivate someone or change their role, and it takes effect on their very next request — no re-login required, no token blacklist needed.

## Request flow

**Login**

1. `POST /api/auth/login` with `{ email, password }`.
2. Backend verifies the password (Argon2, via `pwdlib`) against `Staff.password_hash`.
3. On success, it issues a JWT containing only `sub` (the staff id), `iat`, and `exp` — and sets it as an `access_token` cookie: `httpOnly`, `SameSite=Lax`, `Secure` in production only, `path=/`, `max_age` matching the token's expiry (8h by default).
4. Response body is the logged-in staff's public info: `{ id, name, email, role }`.

**Every subsequent request to a protected route**

1. The browser sends the `access_token` cookie automatically (no frontend code needed for this, beyond `credentials: 'include'` on the fetch).
2. `get_current_staff` (backend) decodes the JWT to get the staff id, then loads that `Staff` row from the database. If the cookie is missing, the token is invalid/expired, the staff no longer exists, or `is_active` is `false` → `401`.
3. `require_role(...)` compares that staff's **current** role (read in step 2, not from the token) against the roles the route allows. Admin always passes. Anyone else who doesn't match → `403`.

**Logout**

`POST /api/auth/logout` clears the cookie (same name and path it was set with) and returns `204`.

## File map

### Backend (`backend/app/`)

| File | What it's for |
|---|---|
| `core/roles.py` | `StaffRoleEnum` (`ADMIN`, `WAITER`, `CHEF`) and `staff_role(staff)` — the one place that turns the database's role name (`"Admin"`, `"Waiter"`, `"Chef"`) into the internal enum. |
| `core/security.py` | `hash_password` / `verify_password` (Argon2), `create_access_token` / `decode_access_token` (JWT). |
| `core/config.py` | `jwt_secret_key`, `jwt_algorithm`, `jwt_expire_minutes`, `cookie_secure` — all read from `.env`. |
| `api/deps.py` | `get_current_staff` and `require_role(...)` — the two dependencies everything else is built on. Also `ACCESS_TOKEN_COOKIE_NAME`, `INVALID_CREDENTIALS_DETAIL`, `FORBIDDEN_DETAIL`. |
| `api/routes/auth.py` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. |
| `api/routes/staff.py` | `GET /staff/ping` — a minimal example of a role-protected route (see below for how to write your own). |
| `db/seeds/staff.py` | Creates the dev Admin account (see "Local setup"). |

### Frontend (`frontend/src/`)

| File | What it's for |
|---|---|
| `services/api/client.ts` | `apiFetch<T>(path, init?)` — the only function that should be used to call the API. Always sends the cookie, throws `ApiError` (with `status` and `detail`) on failure, handles `204` responses. |
| `features/auth/hooks/useAuth.tsx` | `AuthProvider` (wraps the whole app in `AppRouter.tsx`) and the `useAuth()` hook: `{ staff, isLoading, login, logout }`. Also exports the `StaffRole` type and `ROLE_HOME_ROUTE` (which page is "home" for each role). |
| `features/auth/pages/LoginPage.tsx` | The login form. |
| `components/ProtectedRoute.tsx` | Wraps a route element; redirects to `/login` if there's no session, or to the user's own role-home page (with a toast) if they're logged in but the role doesn't match. |

## Using this in new backend endpoints

To require a specific role on a new route, add `require_role(...)` as a dependency. You don't need to touch `deps.py` — just import and use it:

```python
from fastapi import APIRouter, Depends
from app.api.deps import require_role, get_current_staff
from app.core.roles import StaffRoleEnum

router = APIRouter(prefix="/orders")

@router.post("/", dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def create_order(...):
    ...
```

Admin will be able to call this too, automatically — you never need to add `StaffRoleEnum.ADMIN` to the list yourself.

If you need to know *who* is making the request (not just gate by role), depend on `get_current_staff` directly and use the returned `Staff` object:

```python
from app.models.staff import Staff

@router.get("/my-tables")
def my_tables(staff: Staff = Depends(get_current_staff)):
    # staff.id, staff.name, staff.email, staff.staff_role are all available here
    ...
```

**Rules to keep this consistent:**
- Never compare role strings by hand (`if staff.staff_role.name == "Admin"`). Always go through `StaffRoleEnum` and, if you need to read a `Staff` object's current role, the `staff_role(staff)` helper in `app/core/roles.py`.
- There is currently no endpoint to create staff accounts. Only the dev-seed Admin exists. Building a "create staff member" endpoint is future work, and it should itself be `require_role(StaffRoleEnum.ADMIN)`-protected.

## Using this in new frontend pages

Wrap the route in `ProtectedRoute`, listing the role(s) that page belongs to (Admin is implicit, don't list it):

```tsx
<Route
  path="/reports"
  element={
    <ProtectedRoute roles={['admin']}>
      <ReportsPage />
    </ProtectedRoute>
  }
/>
```

To read who's logged in from inside any component:

```tsx
import { useAuth } from '../features/auth/hooks/useAuth';

const { staff, logout } = useAuth(); // staff?.name, staff?.role, ...
```

To call the API, always go through `apiFetch` — never a bare `fetch` — or you'll lose cookie handling and consistent error parsing:

```tsx
import { apiFetch, ApiError } from '../../../services/api/client';

try {
  const data = await apiFetch<MyResponseType>('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
} catch (err) {
  if (err instanceof ApiError) {
    // err.status (401 / 403 / 404 / ...), err.detail (the backend's actual message)
  }
}
```

## Local setup

Every developer needs their own `backend/.env` with a `JWT_SECRET_KEY` (in addition to `DATABASE_URL`, which was already required). Generate one once:

```bash
cd backend
echo "JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')" >> .env
```

The backend won't start without it — `jwt_secret_key` is a required setting (see `.env.example` for the full list of variables).

**Seeded dev Admin** (for local testing only — do not use these credentials anywhere real):

```
email:    admin@scanandserve.dev
password: ChangeMe123!
```

Created by running (from `backend/`, with the venv active):

```bash
python -m app.db.seeds.staff
```

It's idempotent — running it again when the account already exists just prints a message and does nothing.

## User-facing messages (European Portuguese)

The app's UI text is European Portuguese (pt-PT), including these auth-related messages — keep any new auth-adjacent copy consistent with this:

| Situation | Message |
|---|---|
| Wrong password, or no account with that email | `Credenciais inválidas` |
| Correct password, but the account is deactivated | `Conta desativada. Contacta um administrador.` |
| Logged in, but role doesn't allow this page/action | `Não tens permissão para aceder a esta página.` |

The first message is intentionally identical for "wrong password" and "no such email" — this avoids revealing whether a given email belongs to a real account.

## What's explicitly out of scope (not built yet)

- **Creating staff accounts.** Only the dev-seed Admin exists; there's no "add a staff member" flow yet.
- **Fine-grained, per-record permissions** — e.g. "a waiter can only see their own assigned tables." Today's system only checks role, not ownership of a specific record.
- **Rate limiting / brute-force protection** on `/auth/login`.
- **Refresh tokens or "remember me."** Sessions simply expire after 8 hours; there's no silent renewal.
- **Guest (customer) authentication.** Customers at a table use a different, not-yet-built mechanism (a device token tied to their dining session, no password) — nothing in this document applies to them.
