from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.department import Department
from app.models.user import User

departments_bp = Blueprint("departments", __name__, url_prefix="/api/departments")


def serialize(department):
    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "head_name": department.head_name or "",
        "deputy_name": department.deputy_name or "",
    }


@departments_bp.route("", methods=["GET"])
@jwt_required()
def list_departments():
    departments = Department.query.order_by(Department.name).all()
    return jsonify([serialize(d) for d in departments])


@departments_bp.route("", methods=["POST"])
@jwt_required()
def create_department():
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role != "admin":
        return jsonify({"error": "Только администратор может создавать отделы"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Название отдела обязательно"}), 400
    if Department.query.filter_by(name=name).first():
        return jsonify({"error": "Отдел с таким названием уже существует"}), 400

    department = Department(
        name=name,
        description=data.get("description", ""),
        head_name=data.get("head_name", ""),
        deputy_name=data.get("deputy_name", ""),
    )
    db.session.add(department)
    db.session.commit()
    return jsonify(serialize(department)), 201


@departments_bp.route("/<int:department_id>", methods=["PUT"])
@jwt_required()
def update_department(department_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role != "admin":
        return jsonify({"error": "Только администратор может редактировать отделы"}), 403

    department = Department.query.get(department_id)
    if not department:
        return jsonify({"error": "Отдел не найден"}), 404

    data = request.get_json() or {}
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"error": "Название отдела обязательно"}), 400
        existing = Department.query.filter(Department.name == name, Department.id != department_id).first()
        if existing:
            return jsonify({"error": "Отдел с таким названием уже существует"}), 400
        department.name = name
    if "description" in data:
        department.description = data.get("description", "")
    if "head_name" in data:
        department.head_name = data.get("head_name", "")
    if "deputy_name" in data:
        department.deputy_name = data.get("deputy_name", "")

    db.session.commit()
    return jsonify(serialize(department))


@departments_bp.route("/all", methods=["DELETE"])
@jwt_required()
def delete_all_departments():
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role != "admin":
        return jsonify({"error": "Только администратор может удалять отделы"}), 403

    from app.models.sqdcp_row import SqdcpRow
    SqdcpRow.query.filter(SqdcpRow.department_id.isnot(None)).update(
        {SqdcpRow.department_id: None}, synchronize_session=False
    )
    Department.query.delete()
    db.session.commit()
    return jsonify({"ok": True})


@departments_bp.route("/<int:department_id>", methods=["DELETE"])
@jwt_required()
def delete_department(department_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role != "admin":
        return jsonify({"error": "Только администратор может удалять отделы"}), 403

    department = Department.query.get(department_id)
    if not department:
        return jsonify({"ok": True})

    from app.models.sqdcp_row import SqdcpRow
    SqdcpRow.query.filter(SqdcpRow.department_id == department_id).update(
        {SqdcpRow.department_id: None}, synchronize_session=False
    )
    db.session.delete(department)
    db.session.commit()
    return jsonify({"ok": True})
