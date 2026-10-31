# Brightloop Subscription Management System

A platform for managing subscription lifecycles. This repository currently includes the **basic authentication module** only: sign up, login, logout, forgot password, and reset password.

## Stack

- Frontend: Next.js (App Router), JavaScript, Tailwind CSS, Lucide React
- Backend: Python Flask, REST APIs
- Database: SQLite (`backend/instance/brightloop.db`) with SQLAlchemy
- Authentication: JWT (HS256), stored in an httpOnly cookie

## Project layout

```
backend/                 Flask API
  app.py               App factory, CORS, health check
  auth.py              Auth routes
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

Public registration always creates a **CUSTOMER** account. ADMIN and PRODUCT_OWNER cannot be created from `/register`. An ADMIN can create PRODUCT_OWNER accounts. The first ADMIN is created with `python create_admin.py` so credentials are never hardcoded.

## Roles

- `ADMIN` — full administrative access, including creating product owners
- `PRODUCT_OWNER` — limited operational access
- `CUSTOMER` — own account only

Protected APIs use `login_required` and `roles_required`. Authorization uses the verified JWT, then the user record in the database. A role sent by the frontend is never trusted.

## JWT and logout

Login issues a signed JWT with `sub` (user id), `role`, `iat`, and `exp`. The browser stores it in an **httpOnly** `access_token` cookie. `Authorization: Bearer <token>` is also accepted.

**Logout clears the cookie.** It does not keep a server-side denylist. A copied token stays valid until it expires. That matches this stateless JWT setup.

## Database notes

The app uses SQLite. Tables are created with `db.create_all()` on startup (missing tables only; nothing is dropped).

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

After login, users are sent to `/` with a view hint for ADMIN, PRODUCT_OWNER, or CUSTOMER.

## Password rules

Passwords must:

- be more than 8 characters
- contain at least one uppercase letter
- contain at least one lowercase letter
- contain at least one special character
