from app import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    hashed_password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default="user")
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    status = db.Column(db.String(20), default="pending")
