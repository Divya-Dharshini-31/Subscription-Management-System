import enum
import sqlite3
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"
    INTERNAL = "INTERNAL"
    PRODUCT_OWNER = "PRODUCT_OWNER"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum(UserRole, native_enum=False, length=32),
        nullable=False,
        default=UserRole.CUSTOMER,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    reset_tokens = db.relationship(
        "PasswordResetToken",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role.value if isinstance(self.role, UserRole) else self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class DomainRecord(db.Model):
    """Persistent JSON-backed domain aggregate.

    The aggregate payload keeps the public API backwards compatible while the
    identity, ownership, status and monetary values remain queryable columns.
    Monetary columns are integer minor units to avoid floating point drift.
    """
    __abstract__ = True
    id = db.Column(db.String(80), primary_key=True)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    customer_id = db.Column(db.String(80), index=True)
    status = db.Column(db.String(40), index=True)
    amount_minor = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        value = dict(self.payload or {})
        value.setdefault("id", self.id)
        if self.status is not None:
            value["status"] = self.status
        return value


class Product(DomainRecord):
    __tablename__ = "products"


class Plan(DomainRecord):
    __tablename__ = "plans"


class Tax(DomainRecord):
    __tablename__ = "taxes"


class Discount(DomainRecord):
    __tablename__ = "discounts"


class Template(DomainRecord):
    __tablename__ = "templates"


class Customer(DomainRecord):
    __tablename__ = "customers"


class Subscription(DomainRecord):
    __tablename__ = "subscriptions"


class Invoice(DomainRecord):
    __tablename__ = "invoices"
    idempotency_key = db.Column(db.String(128), unique=True, index=True)


class Payment(DomainRecord):
    __tablename__ = "payments"
    invoice_id = db.Column(db.String(80), nullable=False, index=True)
    idempotency_key = db.Column(db.String(128), nullable=False, unique=True, index=True)
