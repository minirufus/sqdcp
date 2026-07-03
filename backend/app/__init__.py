from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///tbp.db"
    app.config["JWT_SECRET_KEY"] = "tbp-secret-key-change-in-production"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    with app.app_context():
        from app.models import user, department, board, chart, event, report, join_request
        db.create_all()

    from app.routers.auth import auth_bp
    from app.routers.departments import departments_bp
    from app.routers.boards import boards_bp
    from app.routers.events import events_bp
    from app.routers.reports import reports_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(boards_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(reports_bp)

    return app
