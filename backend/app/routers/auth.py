import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.department import Department
import bcrypt

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

VALID_ROLES = ["admin", "manager", "user", "viewer"]


def validate_registration(data):
    errors = []
    username = data.get("username", "")
    email = data.get("email", "")
    password = data.get("password", "")

    if len(username) < 3:
        errors.append("Имя пользователя должно быть минимум 3 символа")
    if len(username) > 40:
        errors.append("Имя пользователя не более 40 символов")
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        errors.append("Имя пользователя может содержать только латинские буквы, цифры и _")

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors.append("Некорректный email")

    if len(password) < 6:
        errors.append("Пароль должен быть минимум 6 символов")
    if not re.search(r"[A-Za-z]", password):
        errors.append("Пароль должен содержать хотя бы одну букву")
    if not re.search(r"[0-9]", password):
        errors.append("Пароль должен содержать хотя бы одну цифру")

    if User.query.filter_by(username=username).first():
        errors.append("Пользователь с таким именем уже существует")

    if User.query.filter_by(email=email).first():
        errors.append("Пользователь с таким email уже существует")

    return errors


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    errors = validate_registration(data)
    if errors:
        return jsonify({"errors": errors}), 400

    hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
    user = User(
        username=data["username"],
        email=data["email"],
        hashed_password=hashed,
        role="user",
        department_id=data.get("department_id"),
        status="pending",
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({
        "id": user.id, "username": user.username, "email": user.email,
        "role": user.role, "department_id": user.department_id,
        "status": "pending", "message": "Регистрация успешна. Ожидайте подтверждения администратором."
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data["username"]).first()
    if not user or not bcrypt.checkpw(data["password"].encode(), user.hashed_password.encode()):
        return jsonify({"error": "Неверное имя пользователя или пароль"}), 401

    if user.status == "pending":
        return jsonify({"error": "Ваша учётная запись ещё не подтверждена администратором"}), 403
    if user.status == "rejected":
        return jsonify({"error": "Ваша учётная запись отклонена администратором"}), 403
    if user.status == "blocked":
        return jsonify({"error": "Ваша учётная запись заблокирована администратором"}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "token_type": "bearer"})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.status != "active":
        return jsonify({"error": "Пользователь не активен"}), 403
    return jsonify({
        "id": user.id, "username": user.username, "email": user.email,
        "role": user.role, "department_id": user.department_id, "status": user.status,
    })


@auth_bp.route("/pending", methods=["GET"])
@jwt_required()
def list_pending():
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403

    query = User.query.filter_by(status="pending")
    if current_user.role == "manager":
        query = query.filter_by(department_id=current_user.department_id)

    users = query.all()
    return jsonify([{
        "id": u.id, "username": u.username, "email": u.email,
        "role": u.role, "department_id": u.department_id,
    } for u in users])


@auth_bp.route("/approve/<int:target_id>", methods=["POST"])
@jwt_required()
def approve_user(target_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    target = User.query.get(target_id)

    if not target:
        return jsonify({"error": "Пользователь не найден"}), 404
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403
    if current_user.role == "manager" and target.department_id != current_user.department_id:
        return jsonify({"error": "Вы можете подтверждать только свой отдел"}), 403

    data = request.get_json() or {}
    target.role = data.get("role", "user")
    target.status = "active"
    if data.get("department_id"):
        target.department_id = data["department_id"]
    db.session.commit()
    return jsonify({"id": target.id, "username": target.username, "role": target.role, "status": "active"})


@auth_bp.route("/reject/<int:target_id>", methods=["POST"])
@jwt_required()
def reject_user(target_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    target = User.query.get(target_id)

    if not target:
        return jsonify({"error": "Пользователь не найден"}), 404
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403
    if current_user.role == "manager" and target.department_id != current_user.department_id:
        return jsonify({"error": "Вы можете отклонять только свой отдел"}), 403

    target.status = "rejected"
    db.session.commit()
    return jsonify({"id": target.id, "username": target.username, "status": "rejected"})


@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403

    query = User.query
    if current_user.role == "manager":
        query = query.filter_by(department_id=current_user.department_id)

    users = query.all()
    return jsonify([{
        "id": u.id, "username": u.username, "email": u.email,
        "role": u.role, "department_id": u.department_id, "status": u.status,
    } for u in users])


@auth_bp.route("/users/<int:target_id>", methods=["PUT"])
@jwt_required()
def update_user(target_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    target = User.query.get(target_id)

    if not target:
        return jsonify({"error": "Пользователь не найден"}), 404
    if current_user.role != "admin":
        return jsonify({"error": "Только администратор может изменять пользователей"}), 403
    if target.id == current_user.id:
        return jsonify({"error": "Нельзя редактировать себя через этот endpoint"}), 400

    data = request.get_json() or {}
    if "role" in data:
        if data["role"] not in VALID_ROLES:
            return jsonify({"error": f"Недопустимая роль. Доступны: {', '.join(VALID_ROLES)}"}), 400
        target.role = data["role"]
    if "department_id" in data:
        target.department_id = data["department_id"]
    if "status" in data:
        if data["status"] not in ("active", "blocked", "rejected", "pending"):
            return jsonify({"error": "Недопустимый статус"}), 400
        target.status = data["status"]
    if "email" in data:
        target.email = data["email"]

    db.session.commit()
    return jsonify({
        "id": target.id, "username": target.username, "email": target.email,
        "role": target.role, "department_id": target.department_id, "status": target.status,
    })


@auth_bp.route("/users/<int:target_id>", methods=["DELETE"])
@jwt_required()
def delete_user(target_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    target = User.query.get(target_id)

    if not target:
        return jsonify({"ok": True})
    if current_user.role != "admin":
        return jsonify({"error": "Только администратор может удалять пользователей"}), 403
    if target.id == current_user.id:
        return jsonify({"error": "Нельзя удалить самого себя"}), 400

    db.session.delete(target)
    db.session.commit()
    return jsonify({"ok": True})


@auth_bp.route("/block/<int:target_id>", methods=["POST"])
@jwt_required()
def block_user(target_id):
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    target = User.query.get(target_id)

    if not target:
        return jsonify({"error": "Пользователь не найден"}), 404
    if current_user.role not in ("admin", "manager"):
        return jsonify({"error": "Доступ запрещён"}), 403
    if current_user.role == "manager" and target.department_id != current_user.department_id:
        return jsonify({"error": "Вы можете блокировать только свой отдел"}), 403
    if target.id == current_user.id:
        return jsonify({"error": "Нельзя заблокировать самого себя"}), 400

    target.status = "blocked" if target.status != "blocked" else "active"
    db.session.commit()
    return jsonify({"id": target.id, "username": target.username, "status": target.status})


@auth_bp.route("/seed", methods=["POST"])
def seed_test_users():
    data = request.get_json() or {}
    password = data.get("password", "test123")
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    created = []

    test_users = [
        {"username": "admin", "email": "admin@tbp.local", "role": "admin"},
        {"username": "manager", "email": "manager@tbp.local", "role": "manager"},
        {"username": "user1", "email": "user1@tbp.local", "role": "user"},
        {"username": "viewer", "email": "viewer@tbp.local", "role": "viewer"},
    ]

    for tu in test_users:
        if not User.query.filter_by(username=tu["username"]).first():
            u = User(
                username=tu["username"],
                email=tu["email"],
                hashed_password=hashed,
                role=tu["role"],
                status="active",
            )
            db.session.add(u)
            created.append(tu["username"])

    dept_names = ["Разработка", "Маркетинг", "HR", "Финансы"]
    for dn in dept_names:
        if not Department.query.filter_by(name=dn).first():
            db.session.add(Department(name=dn, description=f"Отдел {dn}"))

    db.session.commit()
    return jsonify({"created_users": created, "note": f"Пароль для всех: {password}"}), 201
