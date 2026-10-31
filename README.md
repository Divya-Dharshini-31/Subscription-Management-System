# Brightloop Subscription Management System

A platform for managing subscription lifecycles. This repository currently includes the **basic authentication module** only: sign up, login, logout, forgot password, and reset password.

## Stack

- Frontend: Next.js (App Router), JavaScript, Tailwind CSS
- Backend: Python Flask, REST APIs
- Database: PostgreSQL (`brightloop_db`) with SQLAlchemy

## Project layout

```
backend/                 Flask API
  app.py               App factory, CORS, health check
  auth.py              Auth routes
  config.py            Environment-based settings
  models.py            User and password-reset tables
  security.py          Hashing, JWT cookies, password rules
  create_admin.py      Bootstrap the first ADMIN account
frontend/               Next.js app
  app/login
  app/register
  app/forgot-password
  app/reset-password
  app/page.js          Signed-in landing (logout + ADMIN staff creation)
```

Public registration always creates a **CUSTOMER** account. ADMIN and STAFF cannot be created from `/register`. STAFF accounts can be created by a signed-in ADMIN. The first ADMIN is created with `python create_admin.py` so credentials are never hardcoded.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

Create the database before starting the API:

```sql
CREATE DATABASE brightloop_db;
```

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

Edit `.env` with your PostgreSQL username, password, and a strong `SECRET_KEY`. Use the `postgresql+psycopg://` URL scheme so SQLAlchemy uses the psycopg 3 driver.

Start the API:

```bash
python app.py
```

The API listens on `http://localhost:5000`. Tables are created automatically on startup.

### Create the first admin

```bash
python create_admin.py
```

You will be prompted for name, email, and password. The password must be more than 8 characters and include uppercase, lowercase, and a special character.

### Auth API

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Customer sign up |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/forgot-password` | Request a reset link |
| POST | `/api/auth/reset-password` | Set a new password |
| POST | `/api/auth/staff` | ADMIN-only staff creation |
| GET | `/api/health` | Health check |

If SMTP settings are empty, password reset links are printed in the Flask console so you can test locally.

## Frontend

```bash
cd frontend
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS / Linux
npm install
npm run dev
```

Open `http://localhost:3000`. Next.js proxies `/api/*` to the Flask backend so the login cookie stays on the same origin.

### Pages

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/` after login: a small role-aware landing with logout (not a product dashboard)

After login, users are sent to `/` with a view hint for ADMIN, STAFF, or CUSTOMER.

## Password rules

Passwords must:

- be more than 8 characters
- contain at least one uppercase letter
- contain at least one lowercase letter
- contain at least one special character
