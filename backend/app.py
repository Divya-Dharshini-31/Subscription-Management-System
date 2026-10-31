from flask import Flask, jsonify
from flask_cors import CORS

from auth import auth_bp
from config import Config, resolve_database_uri
from domain_api import domain_bp
from models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["SQLALCHEMY_DATABASE_URI"] = resolve_database_uri()

    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "connect_args": {"check_same_thread": False}
        }

    db.init_app(app)
    CORS(
        app,
        supports_credentials=True,
        origins=app.config["CORS_ORIGINS"],
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "OPTIONS"],
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(domain_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "database": "sqlite"})

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)
