"""Tests covering the three role-based dashboard requirements and permissions.

Validates:
- Customer login & dashboard redirect (/?view=customer -> /dashboard/customer)
- Internal Staff login & dashboard redirect (/?view=staff -> /dashboard/staff)
- Admin login & dashboard redirect (/?view=admin -> /dashboard/admin)
- Customer accesses Staff or Admin APIs -> Denied (403)
- Internal Staff accesses Admin-only APIs -> Denied (403)
- Admin accesses authorized Admin routes -> Allowed
- Session persistence on refresh (GET /api/auth/me)
- Logout clearing credentials and allowing login with another role
- create_admin.py management of ADMIN and INTERNAL staff accounts
"""

import subprocess
import sys
from models import User, UserRole, db
from security import hash_password

PASSWORD = "ValidPass1!"
NEW_PASS = "NewValid2!"


def setup_user(app, email, role, name="Test User", password=PASSWORD):
    with app.app_context():
        user = User(
            full_name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def test_customer_login_redirect_and_me(client, app):
    setup_user(app, "cust@example.com", UserRole.CUSTOMER, "Customer User")
    res = client.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["role"] == "CUSTOMER"
    assert data["redirect"] == "/?view=customer"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "CUSTOMER"
    assert me.get_json()["redirect"] == "/?view=customer"


def test_internal_staff_login_redirect_and_me(client, app):
    setup_user(app, "staff@example.com", UserRole.INTERNAL, "Staff User")
    res = client.post("/api/auth/login", json={"email": "staff@example.com", "password": PASSWORD})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["role"] == "INTERNAL"
    assert data["redirect"] == "/?view=staff"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "INTERNAL"
    assert me.get_json()["redirect"] == "/?view=staff"


def test_legacy_product_owner_login_redirect_and_me(client, app):
    setup_user(app, "owner@example.com", UserRole.PRODUCT_OWNER, "Owner User")
    res = client.post("/api/auth/login", json={"email": "owner@example.com", "password": PASSWORD})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["role"] == "PRODUCT_OWNER"
    assert data["redirect"] == "/?view=staff"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "PRODUCT_OWNER"
    assert me.get_json()["redirect"] == "/?view=staff"


def test_admin_login_redirect_and_me(client, app):
    setup_user(app, "admin@example.com", UserRole.ADMIN, "Admin User")
    res = client.post("/api/auth/login", json={"email": "admin@example.com", "password": PASSWORD})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["role"] == "ADMIN"
    assert data["redirect"] == "/?view=admin"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "ADMIN"
    assert me.get_json()["redirect"] == "/?view=admin"


def test_customer_accesses_internal_staff_api_denied(client, app):
    setup_user(app, "cust@example.com", UserRole.CUSTOMER, "Customer User")
    client.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})

    # Staff-only APIs must reject customer with 403
    assert client.get("/api/v1/customers").status_code == 403
    assert client.post("/api/v1/billing-runs").status_code == 403
    assert client.get("/api/v1/reports/summary").status_code == 403
    assert client.post("/api/v1/invoices/inv_1/payments", json={"amount": 100, "payment_method": "Cash"}).status_code == 403


def test_customer_accesses_admin_api_denied(client, app):
    setup_user(app, "cust@example.com", UserRole.CUSTOMER, "Customer User")
    client.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})

    payload = {
        "full_name": "New Staff",
        "email": "newstaff@example.com",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    assert client.post("/api/auth/staff", json=payload).status_code == 403
    assert client.post("/api/auth/product-owners", json=payload).status_code == 403


def test_internal_staff_accesses_admin_only_api_denied(client, app):
    setup_user(app, "staff@example.com", UserRole.INTERNAL, "Staff User")
    client.post("/api/auth/login", json={"email": "staff@example.com", "password": PASSWORD})

    payload = {
        "full_name": "Another Staff",
        "email": "another@example.com",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    # Internal staff cannot create other staff or product owners
    assert client.post("/api/auth/staff", json=payload).status_code == 403
    assert client.post("/api/auth/product-owners", json=payload).status_code == 403


def test_admin_accesses_authorized_admin_routes(client, app):
    setup_user(app, "admin@example.com", UserRole.ADMIN, "Admin User")
    client.post("/api/auth/login", json={"email": "admin@example.com", "password": PASSWORD})

    # Admin can create internal staff via /api/auth/staff
    payload_staff = {
        "full_name": "Hired Staff",
        "email": "hiredstaff@example.com",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    res_staff = client.post("/api/auth/staff", json=payload_staff)
    assert res_staff.status_code == 201
    assert res_staff.get_json()["user"]["role"] == "INTERNAL"

    # Admin can also access staff/reports
    assert client.get("/api/v1/reports/summary").status_code == 200


def test_logout_and_login_with_another_role(client, app):
    setup_user(app, "cust@example.com", UserRole.CUSTOMER, "Customer User")
    setup_user(app, "admin@example.com", UserRole.ADMIN, "Admin User")

    # 1. Login as customer
    client.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    me = client.get("/api/auth/me").get_json()
    assert me["user"]["role"] == "CUSTOMER"

    # 2. Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert client.get("/api/auth/me").status_code == 401

    # 3. Login as admin
    client.post("/api/auth/login", json={"email": "admin@example.com", "password": PASSWORD})
    me_admin = client.get("/api/auth/me").get_json()
    assert me_admin["user"]["role"] == "ADMIN"
    assert me_admin["redirect"] == "/?view=admin"


def test_refresh_dashboard_authenticated_session_remains(client, app):
    setup_user(app, "staff@example.com", UserRole.INTERNAL, "Staff User")
    client.post("/api/auth/login", json={"email": "staff@example.com", "password": PASSWORD})

    for _ in range(3):
        res = client.get("/api/auth/me")
        assert res.status_code == 200
        assert res.get_json()["user"]["email"] == "staff@example.com"
        assert res.get_json()["redirect"] == "/?view=staff"


def test_create_admin_cli_and_reset(app):
    with app.app_context():
        # Test creating ADMIN via CLI logic
        from create_admin import parse_args, main
        from security import verify_password

        # Create admin
        sys.argv = [
            "create_admin.py",
            "--name", "CLI Admin",
            "--email", "cli_admin@brightloop.local",
            "--password", PASSWORD,
            "--role", "ADMIN",
        ]
        main()

        admin = User.query.filter_by(email="cli_admin@brightloop.local").first()
        assert admin is not None
        assert admin.role == UserRole.ADMIN
        assert verify_password(admin.password_hash, PASSWORD)

        # Reset password via CLI
        sys.argv = [
            "create_admin.py",
            "--reset",
            "--email", "cli_admin@brightloop.local",
            "--password", NEW_PASS,
        ]
        main()

        db.session.refresh(admin)
        assert verify_password(admin.password_hash, NEW_PASS)

        # Create INTERNAL staff via CLI
        sys.argv = [
            "create_admin.py",
            "--role", "INTERNAL",
            "--name", "CLI Staff",
            "--email", "cli_staff@brightloop.local",
            "--password", PASSWORD,
        ]
        main()

        staff = User.query.filter_by(email="cli_staff@brightloop.local").first()
        assert staff is not None
        assert staff.role == UserRole.INTERNAL
