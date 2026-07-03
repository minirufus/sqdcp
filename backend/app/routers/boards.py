from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.board import Board
from app.models.chart import Chart
from app.models.user import User

boards_bp = Blueprint("boards", __name__, url_prefix="/api/boards")


def can_edit_board(user, board):
    if user.role == "admin":
        return True
    if user.role == "manager" and (not board.department_id or board.department_id == user.department_id):
        return True
    return board.owner_id == user.id


@boards_bp.route("", methods=["GET"])
@jwt_required()
def list_boards():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    boards = Board.query.all()
    result = []
    for b in boards:
        can_edit = can_edit_board(user, b)
        result.append({
            "id": b.id, "title": b.title, "description": b.description,
            "owner_id": b.owner_id, "department_id": b.department_id,
            "can_edit": can_edit,
        })
    return jsonify(result)


@boards_bp.route("", methods=["POST"])
@jwt_required()
def create_board():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role == "viewer":
        return jsonify({"error": "viewer не может создавать доски"}), 403
    data = request.get_json()
    if not data.get("title") or len(data["title"].strip()) < 1:
        return jsonify({"error": "Название доски обязательно"}), 400
    board = Board(
        title=data["title"].strip(),
        description=data.get("description", ""),
        owner_id=user_id,
        department_id=data.get("department_id"),
    )
    db.session.add(board)
    db.session.commit()
    return jsonify({
        "id": board.id, "title": board.title, "description": board.description,
        "owner_id": board.owner_id, "department_id": board.department_id, "can_edit": True,
    }), 201


@boards_bp.route("/<int:board_id>", methods=["GET"])
@jwt_required()
def get_board(board_id):
    board = Board.query.get(board_id)
    if not board:
        return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": board.id, "title": board.title, "description": board.description,
        "owner_id": board.owner_id, "department_id": board.department_id,
    })


@boards_bp.route("/<int:board_id>", methods=["DELETE"])
@jwt_required()
def delete_board(board_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    board = Board.query.get(board_id)
    if not board:
        return jsonify({"ok": True})
    if not can_edit_board(user, board):
        return jsonify({"error": "Недостаточно прав"}), 403
    db.session.delete(board)
    db.session.commit()
    return jsonify({"ok": True})


@boards_bp.route("/<int:board_id>/charts", methods=["GET"])
@jwt_required()
def list_charts(board_id):
    charts = Chart.query.filter_by(board_id=board_id).all()
    return jsonify([{
        "id": c.id, "title": c.title, "chart_type": c.chart_type,
        "config": c.config, "board_id": c.board_id,
    } for c in charts])


@boards_bp.route("/<int:board_id>/charts", methods=["POST"])
@jwt_required()
def create_chart(board_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role == "viewer":
        return jsonify({"error": "viewer не может создавать графики"}), 403
    board = Board.query.get(board_id)
    if not board:
        return jsonify({"error": "Доска не найдена"}), 404
    if not can_edit_board(user, board):
        return jsonify({"error": "Недостаточно прав"}), 403
    data = request.get_json()
    if not data.get("title"):
        return jsonify({"error": "Название графика обязательно"}), 400
    chart = Chart(
        title=data["title"], chart_type=data.get("chart_type", "bar"),
        config=data.get("config", "{}"), board_id=board_id,
    )
    db.session.add(chart)
    db.session.commit()
    return jsonify({
        "id": chart.id, "title": chart.title, "chart_type": chart.chart_type,
        "config": chart.config, "board_id": chart.board_id,
    }), 201


@boards_bp.route("/<int:board_id>/charts/<int:chart_id>", methods=["PUT"])
@jwt_required()
def update_chart(board_id, chart_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    chart = Chart.query.filter_by(id=chart_id, board_id=board_id).first()
    if not chart:
        return jsonify({"error": "График не найден"}), 404
    board = Board.query.get(board_id)
    if not can_edit_board(user, board):
        return jsonify({"error": "Недостаточно прав"}), 403
    data = request.get_json()
    if "title" in data:
        chart.title = data["title"]
    if "chart_type" in data:
        chart.chart_type = data["chart_type"]
    if "config" in data:
        chart.config = data["config"]
    db.session.commit()
    return jsonify({
        "id": chart.id, "title": chart.title, "chart_type": chart.chart_type,
        "config": chart.config, "board_id": chart.board_id,
    })


@boards_bp.route("/<int:board_id>/charts/<int:chart_id>", methods=["DELETE"])
@jwt_required()
def delete_chart(board_id, chart_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    chart = Chart.query.filter_by(id=chart_id, board_id=board_id).first()
    if not chart:
        return jsonify({"ok": True})
    board = Board.query.get(board_id)
    if not can_edit_board(user, board):
        return jsonify({"error": "Недостаточно прав"}), 403
    db.session.delete(chart)
    db.session.commit()
    return jsonify({"ok": True})
