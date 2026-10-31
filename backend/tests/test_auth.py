import jwt
from datetime import timedelta

from models import User, UserRole, db
from security import create_access_token

PASSWORD = "ValidPass1!"
NEW_PASSWORD = "NewValid2!"


def register(client, email="customer@example.com", **overrides):
    payload = {
        "full_name": "Casey Customer",
        "email": email,
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    payload.update(overrides)
    return client.post("/api/auth/register", json=payload)


def login(client, email="customer@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def create_user(app, email, role, name="Test User"):
    with app.app_context():
        user = User(
            full_name=name,
            email=email,
            password_hash=__import__("security").hash_password(PASSWORD),
            role=role,
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def test_sqlite_tables_are_created(app):
    with app.app_context():
        assert "sqlite" in app.config["SQLALCHEMY_DATABASE_URI"]
        assert db.engine.dialect.name == "sqlite"
        table_names = set(db.inspect(db.engine).get_table_names())
        assert "users" in table_names
        assert "password_reset_tokens" in table_names


def test_customer_registration(client):
    response = register(client)
    assert response.status_code == 201
    body = response.get_json()
    assert body["user"]["role"] == "CUSTOMER"
    assert body["user"]["email"] == "customer@example.com"


def test_duplicate_email_rejected(client):
    assert register(client).status_code == 201
    response = register(client)
    assert response.status_code == 409
    assert "already exists" in response.get_json()["error"]


def test_public_registration_allows_selected_role(client):
    response = register(client, email="admin-role@example.com", role="ADMIN")
    assert response.status_code == 201
    assert response.get_json()["user"]["role"] == "ADMIN"

    response = register(client, email="staff-role@example.com", role="INTERNAL")
    assert response.status_code == 201
    assert response.get_json()["user"]["role"] == "INTERNAL"

    response = register(client, email="customer-role@example.com", role="CUSTOMER")
    assert response.status_code == 201
    assert response.get_json()["user"]["role"] == "CUSTOMER"


def test_login_sets_jwt_cookie_with_expected_claims(client, app):
    register(client)
    response = login(client)
    assert response.status_code == 200
    token = response.headers.get("Set-Cookie", "")
    assert "access_token=" in token

    cookie_value = client.get_cookie("access_token").value
    payload = jwt.decode(cookie_value, app.config["SECRET_KEY"], algorithms=["HS256"])
    assert payload["sub"]
    assert payload["role"] == "CUSTOMER"
    assert "iat" in payload
    assert "exp" in payload
    assert response.get_json()["redirect"] == "/dashboard/customer"


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_invalid_jwt_rejected(client):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401


def test_expired_jwt_rejected(client, app):
    register(client)
    with app.app_context():
        user = User.query.filter_by(email="customer@example.com").first()
        token = create_access_token(user, expires_delta=timedelta(seconds=-5))

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.get_json()["error"].lower()


def test_logout_clears_cookie(client):
    register(client)
    login(client)
    assert client.get("/api/auth/me").status_code == 200
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_forgot_and_reset_password(client, app, monkeypatch):
    register(client)
    captured = {}

    def fake_send(user, raw_token):
        captured["token"] = raw_token
        captured["email"] = user.email

    monkeypatch.setattr("auth.send_reset_email", fake_send)

    forgot = client.post(
        "/api/auth/forgot-password",
        json={"email": "customer@example.com"},
    )
    assert forgot.status_code == 200
    assert "If that email is registered" in forgot.get_json()["message"]
    assert captured["token"]

    reset = client.post(
        "/api/auth/reset-password",
        json={
            "token": captured["token"],
            "password": NEW_PASSWORD,
            "confirm_password": NEW_PASSWORD,
        },
    )
    assert reset.status_code == 200
    assert login(client).status_code == 401
    assert login(client, password=NEW_PASSWORD).status_code == 200


def test_role_protection_admin_customer_product_owner(client, app):
    create_user(app, "admin@example.com", UserRole.ADMIN, "Ada Admin")
    create_user(app, "owner@example.com", UserRole.PRODUCT_OWNER, "Pat Owner")
    register(client, email="cust@example.com")

    payload = {
        "full_name": "New Owner",
        "email": "new-owner@example.com",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }

    unauthenticated = client.post("/api/auth/product-owners", json=payload)
    assert unauthenticated.status_code == 401

    login(client, email="cust@example.com")
    customer_denied = client.post("/api/auth/product-owners", json=payload)
    assert customer_denied.status_code == 403
    client.post("/api/auth/logout")

    login(client, email="owner@example.com")
    owner_denied = client.post("/api/auth/product-owners", json=payload)
    assert owner_denied.status_code == 403
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "PRODUCT_OWNER"
    client.post("/api/auth/logout")

    login(client, email="admin@example.com")
    created = client.post("/api/auth/product-owners", json=payload)
    assert created.status_code == 201
    assert created.get_json()["user"]["role"] == "PRODUCT_OWNER"

def test_forgot_password_with_missing_smtp_credentials(client, app, monkeypatch, caplog):
    """Test that forgot password works even when SMTP_HOST is set but credentials are missing"""
    register(client)
    
    # Temporarily configure app with SMTP_HOST but no credentials
    original_config = dict(app.config)
    app.config.update({
        'SMTP_HOST': 'smtp.gmail.com',
        'SMTP_USER': '',
        'SMTP_PASSWORD': '',
        'SMTP_FROM': '',
        'SMTP_PORT': 587,
        'SMTP_USE_TLS': True
    })
    
    try:
        # Use caplog to capture logs
        import logging
        caplog.set_level(logging.WARNING)
        
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "customer@example.com"},
        )
        
        # Should still return success (but log warning)
        assert response.status_code == 200
        assert "If that email is registered" in response.get_json()["message"]
        
        # Check that warning was logged
        warning_logged = any(
            "SMTP_HOST configured but SMTP_USER or SMTP_PASSWORD missing" in record.message
            for record in caplog.records
        )
        assert warning_logged, "Expected warning about missing SMTP credentials"
        
    finally:
        # Restore original config
        app.config.update(original_config)


def test_forgot_password_smtp_authentication_error(client, app, monkeypatch):
    """Test that SMTP authentication errors are properly handled"""
    register(client)
    
    def mock_smtp_auth_error(*args, **kwargs):
        import smtplib
        raise smtplib.SMTPAuthenticationError(535, b'5.7.8 Authentication credentials invalid')
    
    # Mock send_reset_email to raise authentication error
    monkeypatch.setattr("auth.send_reset_email", mock_smtp_auth_error)
    
    response = client.post(
        "/api/auth/forgot-password",
        json={"email": "customer@example.com"},
    )
    
    # Should return 500 error when email sending fails
    assert response.status_code == 500
    assert "Could not send the reset email" in response.get_json()["error"]


def test_forgot_password_smtp_success_with_credentials(client, app, monkeypatch):
    """Test successful email sending when SMTP credentials are provided"""
    register(client)
    
    captured_email = {}
    
    def mock_successful_send(user, raw_token):
        # Store user email instead of user object to avoid detached instance issues
        captured_email['user_email'] = user.email
        captured_email['token'] = raw_token
        captured_email['sent'] = True
    
    # Mock send_reset_email
    monkeypatch.setattr("auth.send_reset_email", mock_successful_send)
    
    # Configure app with SMTP credentials
    original_config = dict(app.config)
    app.config.update({
        'SMTP_HOST': 'smtp.gmail.com',
        'SMTP_USER': 'test@gmail.com',
        'SMTP_PASSWORD': 'valid-password',
        'SMTP_FROM': 'test@gmail.com',
        'SMTP_PORT': 587,
        'SMTP_USE_TLS': True
    })
    
    try:
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "customer@example.com"},
        )
        
        # Should return success
        assert response.status_code == 200
        assert "If that email is registered" in response.get_json()["message"]
        assert captured_email['sent'] == True
        assert captured_email['user_email'] == "customer@example.com"
        assert captured_email['token'] is not None
        
    finally:
        # Restore original config
        app.config.update(original_config)