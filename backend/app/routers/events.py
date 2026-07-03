from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.event import Event
from app.models.user import User

events_bp = Blueprint("events", __name__, url_prefix="/api/events")


@events_bp.route("", methods=["GET"])
@jwt_required()
def list_events():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    query = Event.query
    if user.role not in ("admin", "manager"):
        query = query.filter(
            (Event.user_id == user_id) | (Event.department_id == user.department_id)
        )
    events = query.all()
    result = []
    for e in events:
        result.append({
            "id": e.id, "title": e.title, "description": e.description,
            "start_time": e.start_time.isoformat() if e.start_time else "",
            "end_time": e.end_time.isoformat() if e.end_time else "",
            "user_id": e.user_id, "department_id": e.department_id,
        })
    return jsonify(result)


@events_bp.route("", methods=["POST"])
@jwt_required()
def create_event():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data.get("title"):
        return jsonify({"error": "Название события обязательно"}), 400

    start_time = datetime.fromisoformat(data["start_time"])
    end_time = datetime.fromisoformat(data["end_time"])

    if end_time <= start_time:
        return jsonify({"error": "Время окончания должно быть позже начала"}), 400

    event = Event(
        title=data["title"], description=data.get("description", ""),
        start_time=start_time, end_time=end_time,
        user_id=user_id, department_id=data.get("department_id"),
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({
        "id": event.id, "title": event.title, "description": event.description,
        "start_time": event.start_time.isoformat(), "end_time": event.end_time.isoformat(),
        "user_id": event.user_id, "department_id": event.department_id,
    }), 201


@events_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"ok": True})
    if event.user_id != user_id and user.role not in ("admin", "manager"):
        return jsonify({"error": "Недостаточно прав"}), 403
    db.session.delete(event)
    db.session.commit()
    return jsonify({"ok": True})
