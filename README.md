# Brightloop Subscription Management System

A platform for managing subscription lifecycles. The repository includes authentication plus a secured subscription domain API for
catalog data, subscriptions, invoices, payments, billing runs, and finance
summary reporting. The dashboard screens are role-specific and the API remains
the enforcement boundary.

## Stack

- Frontend: Next.js (App Router), JavaScript, Tailwind CSS, Lucide React
- Backend: Python Flask, REST APIs
- Database: SQLite (`backend/instance/brightloop.db`) with SQLAlchemy
- Authentication: JWT (HS256), stored in an httpOnly cookie

## Project layout

```
backend/                 Flask API
  app.py               App factory, CORS, health check, domain API registration
  auth.py              Auth routes
  domain_api.py        Versioned subscription, billing, payment, and reporting API
  config.py            Environment-based settings (SQLite path)
  models.py            User and password-reset tables
  security.py          Hashing, JWT, password rules, role decorators
  create_admin.py      Bootstrap ADMIN or PRODUCT_OWNER accounts
  instance/            Local SQLite file (created on first run)
  tests/               Auth API tests
frontend/               Next.js app
  app/login
  app/register
  app/forgot-password
  app/reset-password
  app/page.js          Signed-in landing (logout + ADMIN product-owner creation)
```

Public registration always creates a **CUSTOMER** account. ADMIN and staff
cannot be created from `/register`. An ADMIN can create staff through
`/api/auth/staff`; the legacy `/api/auth/product-owners` endpoint remains
available for compatibility and creates the legacy `PRODUCT_OWNER` role.
`INTERNAL` and `PRODUCT_OWNER` have the same staff API permissions.

## Roles

- `ADMIN` — full administrative access, including creating product owners
- `PRODUCT_OWNER` — limited operational access
- `CUSTOMER` — own account only

Protected APIs use `login_required` and `roles_required`. Authorization uses the verified JWT, then the user record in the database. A role sent by the frontend is never trusted.

## JWT and logout

Login issues a signed JWT with `sub` (user id), `role`, `iat`, and `exp`. The browser stores it in an **httpOnly** `access_token` cookie. `Authorization: Bearer <token>` is also accepted.

**Logout clears the cookie.** It does not keep a server-side denylist. A copied token stays valid until it expires. That matches this stateless JWT setup.

## Database notes

The app uses SQLite. Tables are created with `db.create_all()` on startup
(missing tables only; nothing is dropped). SQLite connections enable foreign
keys, WAL journaling, normal synchronous writes, and a 5-second busy timeout.
Domain records are persisted in SQLAlchemy tables with indexed identity,
ownership, status, and integer minor-unit amount columns.

Money submitted to the API remains in major currency units for compatibility,
but is stored as integer minor units. Values use `ROUND_HALF_UP`. Payment
requests are idempotent and require an `Idempotency-Key` header.

If you previously configured PostgreSQL, those records are **not** copied into SQLite. Start with a new local file at `backend/instance/brightloop.db`, then recreate accounts (including the first admin).

## Prerequisites

- Python 3.11+
- Node.js 18+

PostgreSQL is not required.

## Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

Set a strong `SECRET_KEY` in `.env`. You can omit `DATABASE_URL`; the API still uses `backend/instance/brightloop.db` regardless of the current directory.

Start the API:

```bash
python app.py
```

The API listens on `http://localhost:5000`.

### Create privileged accounts

```bash
python create_admin.py
python create_admin.py --role PRODUCT_OWNER
```

You will be prompted for name, email, and password. The password must be more than 8 characters and include uppercase, lowercase, and a special character.

### Auth API

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Customer sign up |
| POST | `/api/auth/login` | Email/password login; sets JWT cookie |
| POST | `/api/auth/logout` | Clear JWT cookie |
| GET | `/api/auth/me` | Current user (JWT required) |
| POST | `/api/auth/forgot-password` | Request a reset link |
| POST | `/api/auth/reset-password` | Set a new password |
| POST | `/api/auth/product-owners` | ADMIN-only product owner creation |
| GET | `/api/health` | Health check |

If SMTP settings are empty, password reset links are printed in the Flask console (development only). The API never returns the raw reset token in JSON.

### Tests

```bash
cd backend
.\.venv\Scripts\python -m pytest tests -q
```

Tests use a temporary SQLite file. They do not delete `instance/brightloop.db`.

## Frontend

```bash
cd frontend
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS / Linux
npm install
npm run dev
```

Open `http://localhost:3000`. Next.js proxies `/api/*` to Flask so the JWT cookie stays on the same origin.

### Pages

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/` after login: a small role-aware landing with logout (not a product dashboard)

After login, users are sent to `/` with a view hint for ADMIN, staff, or
CUSTOMER. The root page then redirects to the matching dashboard route.

### Subscription API

The domain endpoints are under `/api/v1` and require the JWT cookie or a
Bearer token. Customers receive 404 for records outside their own customer
profile; admin and staff receive the operational views.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/catalog/products` | List products (also plans, taxes, discounts, templates) |
| POST | `/api/v1/catalog/{resource}` | Admin-only catalog creation with an allow-listed payload |
| GET | `/api/v1/customers` | Paginated customer list (admin/staff) |
| GET | `/api/v1/subscriptions` | Paginated, optionally status-filtered subscriptions |
| POST | `/api/v1/subscriptions/<id>/actions/<action>` | Enforce subscription state transitions |
| GET | `/api/v1/invoices` | Paginated invoice list |
| POST | `/api/v1/invoices/<id>/actions/confirm` | Confirm a draft invoice |
| POST | `/api/v1/invoices/<id>/payments` | Record an idempotent partial/full payment |
| GET | `/api/v1/payments` | Paginated payment list with customer scoping |
| POST | `/api/v1/billing-runs` | Generate due invoices for a requested `date` |
| GET | `/api/v1/reports/summary` | Staff/admin finance summary |

Payment requests cannot exceed the invoice amount due. Invoice and subscription
state transitions are rejected server-side when invalid. The development seed
is loaded idempotently into the SQLAlchemy domain tables on first startup, and
rerunning a billing date does not create duplicate invoices.

## Password rules

Passwords must:

- be more than 8 characters
- contain at least one uppercase letter
- contain at least one lowercase letter
- contain at least one special character
