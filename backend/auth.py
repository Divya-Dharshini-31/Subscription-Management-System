import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from models import PasswordResetToken, User, UserRole, db
from security import (
    clear_auth_cookie,
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    login_required,
    normalize_email,
    roles_required,
    set_auth_cookie,
    validate_password,
    verify_password,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

GENERIC_RESET_MESSAGE = (
    "If that email is registered, a password reset link has been sent."
)


def json_error(message, status=400):
    return jsonify({"error": message}), status


def require_fields(payload, fields):
    missing = [field for field in fields if not str(payload.get(field, "")).strip()]
    if missing:
        return json_error(f"Missing required field(s): {', '.join(missing)}.")
    return None


def send_reset_email(user, raw_token):
    reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={raw_token}"
    subject = "Reset your Brightloop password"
    body = (
        f"Hello {user.full_name},\n\n"
        "We received a request to reset your Brightloop password. "
        "Open the link below to choose a new password. "
        f"This link expires in {current_app.config['RESET_TOKEN_EXPIRY_MINUTES']} minutes.\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email.\n"
    )

    smtp_host = current_app.config.get("SMTP_HOST")
    if not smtp_host:
        current_app.logger.info("Password reset link for %s: %s", user.email, reset_url)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["SMTP_FROM"]
    message["To"] = user.email
    message.set_content(body)

    with smtplib.SMTP(smtp_host, current_app.config["SMTP_PORT"]) as smtp:
        if current_app.config["SMTP_USE_TLS"]:
            smtp.starttls()
        if current_app.config["SMTP_USER"]:
            smtp.login(current_app.config["SMTP_USER"], current_app.config["SMTP_PASSWORD"])
        smtp.send_message(message)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["full_name", "email", "password", "confirm_password"])
    if error:
        return error

    full_name = payload["full_name"].strip()
    email = normalize_email(payload["email"])
    password = payload["password"]
    confirm_password = payload["confirm_password"]

    if "@" not in email or "." not in email.split("@")[-1]:
        return json_error("Enter a valid email address.")
    if password != confirm_password:
        return json_error("Password and confirm password do not match.")

    valid, hint = validate_password(password)
    if not valid:
        return json_error(hint)

    if User.query.filter_by(email=email).first():
        return json_error("An account with this email already exists.", 409)

    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.CUSTOMER,
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return json_error("An account with this email already exists.", 409)

    return jsonify({"message": "Account created. You can now log in.", "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["email", "password"])
    if error:
        return error

    email = normalize_email(payload["email"])
    password = payload["password"]
    user = User.query.filter_by(email=email).first()

    if not user or not verify_password(user.password_hash, password):
        return json_error("Invalid email or password.", 401)

    token = create_access_token(user)
    response = jsonify(
        {
            "message": "Logged in successfully.",
            "user": user.to_dict(),
            "redirect": role_home(user.role),
        }
    )
    return set_auth_cookie(response, token)


@auth_bp.post("/logout")
def logout():
    response = jsonify({"message": "Logged out successfully."})
    return clear_auth_cookie(response)


@auth_bp.get("/me")
@login_required
def me():
    return jsonify({"user": g.current_user.to_dict(), "redirect": role_home(g.current_user.role)})


@auth_bp.post("/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["email"])
    if error:
        return error

    email = normalize_email(payload["email"])
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": GENERIC_RESET_MESSAGE})

    raw_token, token_hash = generate_reset_token()
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})
    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=current_app.config["RESET_TOKEN_EXPIRY_MINUTES"]),
    )
    db.session.add(reset)
    db.session.commit()

    try:
        send_reset_email(user, raw_token)
    except Exception:
        current_app.logger.exception("Failed to send password reset email")
        return json_error("Could not send the reset email. Please try again later.", 500)

    return jsonify({"message": GENERIC_RESET_MESSAGE})


@auth_bp.post("/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["token", "password", "confirm_password"])
    if error:
        return error

    password = payload["password"]
    if password != payload["confirm_password"]:
        return json_error("Password and confirm password do not match.")

    valid, hint = validate_password(password)
    if not valid:
        return json_error(hint)

    token_hash = hash_reset_token(payload["token"].strip())
    reset = PasswordResetToken.query.filter_by(token_hash=token_hash, used=False).first()
    now = datetime.now(timezone.utc)
    expires_at = reset.expires_at if reset else None
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not reset or expires_at < now:
        return json_error("This reset link is invalid or has expired.", 400)

    user = reset.user
    user.password_hash = hash_password(password)
    reset.used = True
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})
    db.session.commit()

    return jsonify({"message": "Password updated. You can now log in."})


@auth_bp.post("/staff")
@roles_required(UserRole.ADMIN)
def create_staff():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["full_name", "email", "password", "confirm_password"])
    if error:
        return error

    email = normalize_email(payload["email"])
    password = payload["password"]
    if password != payload["confirm_password"]:
        return json_error("Password and confirm password do not match.")

    valid, hint = validate_password(password)
    if not valid:
        return json_error(hint)

    if User.query.filter_by(email=email).first():
        return json_error("An account with this email already exists.", 409)

    staff = User(
        full_name=payload["full_name"].strip(),
        email=email,
        password_hash=hash_password(password),
        role=UserRole.STAFF,
    )
    db.session.add(staff)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return json_error("An account with this email already exists.", 409)

    return jsonify({"message": "Staff account created.", "user": staff.to_dict()}), 201


def role_home(role):
    value = role.value if isinstance(role, UserRole) else role
    if value == UserRole.ADMIN.value:
        return "/?view=admin"
    if value == UserRole.STAFF.value:
        return "/?view=staff"
    return "/?view=customer"
