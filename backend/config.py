import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BACKEND_DIR / "instance"
SQLITE_FILENAME = "brightloop.db"


def _bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def default_sqlite_uri():
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    db_path = INSTANCE_DIR / SQLITE_FILENAME
    return "sqlite:///" + db_path.as_posix()


def resolve_database_uri():
    """Use local SQLite unless a non-Postgres DATABASE_URL is explicitly set.

    Relative sqlite:/// paths are rewritten to backend/instance/brightloop.db so
    the file location does not depend on the shell cwd. PostgreSQL URLs are
    ignored so leftover .env values cannot keep Postgres active.
    """
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url or url.startswith("postgresql"):
        return default_sqlite_uri()
    if url.startswith("sqlite:///") and ":memory:" not in url:
        rest = url[len("sqlite:///") :]
        if rest and not Path(rest).is_absolute():
            return default_sqlite_uri()
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    SQLALCHEMY_DATABASE_URI = resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "12"))
    RESET_TOKEN_EXPIRY_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRY_MINUTES", "30"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]
    SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "").strip()
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "noreply@brightloop.local")
    SMTP_USE_TLS = _bool(os.getenv("SMTP_USE_TLS"), True)
