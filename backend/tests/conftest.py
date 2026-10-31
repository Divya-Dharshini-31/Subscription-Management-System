import pytest

from app import create_app
from models import db


@pytest.fixture
def app(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", "sqlite:///" + db_file.as_posix())
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("SMTP_HOST", "")
    application = create_app()
    application.config["TESTING"] = True
    yield application
    with application.app_context():
        db.session.remove()


@pytest.fixture
def client(app):
    return app.test_client()
