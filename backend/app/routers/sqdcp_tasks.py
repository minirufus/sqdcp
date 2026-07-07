from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.sqdcp_task import SqdcpTask
from app.models.board import Board

sqdcp_tasks_bp = Blueprint("sqdcp_tasks", __name__, url_prefix="/api/boards")


@sqdcp_tasks_bp.route("/<int:board_id>/tasks", methods=["GET"])
@jwt_required()
def list_tasks(board_id):
    board = Board.query.get(board_id)
    if not board:
        return jsonify({"error": "Not found"}), 404
    tasks = SqdcpTask.query.filter_by(board_id=board_id).order_by(SqdcpTask.created_at.desc()).all()
    return jsonify([{
        "id": t.id,
        "row_id": t.row_id,
        "column_key": t.column_key,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "assignee": t.assignee,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    } for t in tasks])


@sqdcp_tasks_bp.route("/<int:board_id>/tasks", methods=["POST"])
@jwt_required()
def create_task(board_id):
    board = Board.query.get(board_id)
    if not board:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    if not data or not data.get("title"):
        return jsonify({"error": "Название задачи обязательно"}), 400
    task = SqdcpTask(
        board_id=board_id,
        row_id=data.get("row_id"),
        column_key=data.get("column_key", "safety"),
        title=data["title"].strip(),
        description=data.get("description", ""),
        status=data.get("status", "todo"),
        assignee=data.get("assignee", ""),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({
        "id": task.id, "row_id": task.row_id, "column_key": task.column_key,
        "title": task.title, "description": task.description,
        "status": task.status, "assignee": task.assignee,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }), 201


@sqdcp_tasks_bp.route("/<int:board_id>/tasks/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(board_id, task_id):
    task = SqdcpTask.query.filter_by(id=task_id, board_id=board_id).first()
    if not task:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    if "title" in data and data["title"].strip():
        task.title = data["title"].strip()
    if "description" in data:
        task.description = data["description"]
    if "status" in data:
        task.status = data["status"]
    if "assignee" in data:
        task.assignee = data["assignee"]
    if "column_key" in data:
        task.column_key = data["column_key"]
    db.session.commit()
    return jsonify({"ok": True})


@sqdcp_tasks_bp.route("/<int:board_id>/tasks/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(board_id, task_id):
    task = SqdcpTask.query.filter_by(id=task_id, board_id=board_id).first()
    if not task:
        return jsonify({"ok": True})
    db.session.delete(task)
    db.session.commit()
    return jsonify({"ok": True})
