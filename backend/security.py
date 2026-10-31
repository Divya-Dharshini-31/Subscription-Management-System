import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from models import User, UserRole, db

PASSWORD_HINT = (
    "Password must be more than 8 characters and include at least one uppercase "
    "letter, one lowercase letter, and one special character."
)
COOKIE_NAME = "access_token"


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password_hash, password):
    return check_password_hash(password_hash, password)


def validate_password(password):
    if not password or len(password) <= 8:
        return False, PASSWORD_HINT
    if not re.search(r"[A-Z]", password):
        return False, PASSWORD_HINT
    if not re.search(r"[a-z]", password):
        return False, PASSWORD_HINT
    if not re.search(r"[^A-Za-z0-9]", password):
        return False, PASSWORD_HINT
    return True, None


def normalize_email(email):
    return (email or "").strip().lower()


def create_access_token(user):
    payload = {
        "sub": user.id,
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=current_app.config["JWT_EXPIRY_HOURS"]),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def decode_access_token(token):
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def set_auth_cookie(response, token):
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        samesite="Lax",
        secure=False,
        path="/",
        max_age=current_app.config["JWT_EXPIRY_HOURS"] * 3600,
    )
    return response


def clear_auth_cookie(response):
    response.set_cookie(
        COOKIE_NAME,
        "",
        httponly=True,
        samesite="Lax",
        secure=False,
        path="/",
        expires=0,
        max_age=0,
    )
    return response


def get_token_from_request():
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1].strip()
    return None


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return jsonify({"error": "Authentication required."}), 401
        try:
            payload = decode_access_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid session. Please log in again."}), 401

        user = db.session.get(User, payload.get("sub"))
        if not user:
            return jsonify({"error": "Account not found."}), 401

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def roles_required(*roles):
    allowed = {role.value if isinstance(role, UserRole) else role for role in roles}

    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapper(*args, **kwargs):
            if g.current_user.role.value not in allowed:
                return jsonify({"error": "You do not have permission to do that."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def generate_reset_token():
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_reset_token(raw_token):
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
