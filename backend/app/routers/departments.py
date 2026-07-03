from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.department import Department
from app.models.board import Board
from app.models.user import User
from app.models.join_request import JoinRequest

departments_bp = Blueprint("departments", __name__, url_prefix="/api/departments")


def can_edit_department(user, dept_id):
    if user.role == "admin":
        return True
    if user.role == "manager" and user.department_id == dept_id:
        return True
    return False


@departments_bp.route("", methods=["GET"])
@jwt_required()
def list_departments():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    depts = Department.query.all()
    result = []
    for d in depts:
        boards_count = Board.query.filter_by(department_id=d.id).count()
        users_count = User.query.filter_by(department_id=d.id).count()
        can_edit = can_edit_department(user, d.id)
        result.append({
            "id": d.id, "name": d.name, "description": d.description,
            "boards_count": boards_count, "users_count": users_count,
            "can_edit": can_edit, "is_own": user.department_id == d.id,
        })
    return jsonify(result)


@departments_bp.route("", methods=["POST"])
@jwt_required()
def create_department():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ("admin", "manager"):
        return jsonify({"error": "Только admin/manager могут создавать отделы"}), 403
    data = request.get_json()
    if not data.get("name") or len(data["name"].strip()) < 2:
        return jsonify({"error": "Название отдела минимум 2 символа"}), 400
    dept = Department(name=data["name"].strip(), description=data.get("description", ""))
    db.session.add(dept)
    db.session.commit()
    return jsonify({"id": dept.id, "name": dept.name, "description": dept.description}), 201


@departments_bp.route("/<int:dept_id>", methods=["GET"])
@jwt_required()
def get_department(dept_id):
    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({"error": "Отдел не найден"}), 404
    boards = Board.query.filter_by(department_id=dept_id).all()
    users = User.query.filter_by(department_id=dept_id).all()
    return jsonify({
        "id": dept.id, "name": dept.name, "description": dept.description,
        "boards": [{"id": b.id, "title": b.title} for b in boards],
        "users": [{"id": u.id, "username": u.username, "role": u.role} for u in users],
    })


@departments_bp.route("/<int:dept_id>", methods=["DELETE"])
@jwt_required()
def delete_department(dept_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not can_edit_department(user, dept_id):
        return jsonify({"error": "Недостаточно прав"}), 403
    dept = Department.query.get(dept_id)
    if dept:
        db.session.delete(dept)
        db.session.commit()
    return jsonify({"ok": True})


@departments_bp.route("/<int:dept_id>", methods=["PUT"])
@jwt_required()
def update_department(dept_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not can_edit_department(user, dept_id):
        return jsonify({"error": "Недостаточно прав"}), 403
    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({"error": "Отдел не найден"}), 404
    data = request.get_json()
    if "name" in data:
        dept.name = data["name"]
    if "description" in data:
        dept.description = data["description"]
    db.session.commit()
    return jsonify({"id": dept.id, "name": dept.name, "description": dept.description})


@departments_bp.route("/<int:dept_id>/join", methods=["POST"])
@jwt_required()
def request_join(dept_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user.role not in ("user", "viewer"):
        return jsonify({"error": "Только user/viewer могут запросить присоединение"}), 403
    if user.department_id:
        return jsonify({"error": "Вы уже состоите в отделе"}), 400

    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({"error": "Отдел не найден"}), 404

    existing = JoinRequest.query.filter_by(
        user_id=user_id, department_id=dept_id, status="pending"
    ).first()
    if existing:
        return jsonify({"error": "Заявка уже отправлена"}), 400

    jr = JoinRequest(user_id=user_id, department_id=dept_id)
    db.session.add(jr)
    db.session.commit()
    return jsonify({"id": jr.id, "status": "pending"}), 201


@departments_bp.route("/join-requests", methods=["GET"])
@jwt_required()
def list_join_requests():
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403

    query = JoinRequest.query.filter_by(status="pending")
    if current_user.role == "manager":
        query = query.filter_by(department_id=current_user.department_id)

    requests = query.all()
    result = []
    for jr in requests:
        u = User.query.get(jr.user_id)
        result.append({
            "id": jr.id,
            "user_id": jr.user_id,
            "username": u.username if u else "Unknown",
            "department_id": jr.department_id,
            "department_name": Department.query.get(jr.department_id).name if Department.query.get(jr.department_id) else "Unknown",
            "created_at": jr.created_at.isoformat() if jr.created_at else None,
        })
    return jsonify(result)


@departments_bp.route("/join-requests/<int:req_id>/approve", methods=["POST"])
@jwt_required()
def approve_join_request(req_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403

    jr = JoinRequest.query.get(req_id)
    if not jr or jr.status != "pending":
        return jsonify({"error": "Заявка не найдена"}), 404

    if current_user.role == "manager" and jr.department_id != current_user.department_id:
        return jsonify({"error": "Вы можете подтверждать только свой отдел"}), 403

    target = User.query.get(jr.user_id)
    if not target:
        return jsonify({"error": "Пользователь не найден"}), 404

    target.department_id = jr.department_id
    jr.status = "approved"
    db.session.commit()
    return jsonify({"ok": True, "user_id": target.id, "department_id": target.department_id})


@departments_bp.route("/join-requests/<int:req_id>/reject", methods=["POST"])
@jwt_required()
def reject_join_request(req_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403

    jr = JoinRequest.query.get(req_id)
    if not jr or jr.status != "pending":
        return jsonify({"error": "Заявка не найдена"}), 404

    if current_user.role == "manager" and jr.department_id != current_user.department_id:
        return jsonify({"error": "Вы можете отклонять только свой отдел"}), 403

    jr.status = "rejected"
    db.session.commit()
    return jsonify({"ok": True})
