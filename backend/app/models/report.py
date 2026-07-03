from app import db
from datetime import datetime


class Report(db.Model):
    __tablename__ = "reports"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), default="")
    file_name = db.Column(db.String(255), default="")
    file_data = db.Column(db.LargeBinary, nullable=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
