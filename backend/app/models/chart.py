from app import db
from datetime import datetime


class Chart(db.Model):
    __tablename__ = "charts"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    chart_type = db.Column(db.String(50), nullable=False)
    config = db.Column(db.Text, default="{}")
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
