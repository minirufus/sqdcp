from app import db
from datetime import datetime


class SqdcpTask(db.Model):
    __tablename__ = "sqdcp_tasks"
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"), nullable=False)
    row_id = db.Column(db.Integer, db.ForeignKey("sqdcp_rows.id"), nullable=True)
    column_key = db.Column(db.String(20), default="safety")
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="todo")
    assignee = db.Column(db.String(100), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
