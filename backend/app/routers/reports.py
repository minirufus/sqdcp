from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from io import BytesIO
from app import db
from app.models.report import Report
from app.models.user import User

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.route("", methods=["GET"])
@jwt_required()
def list_reports():
    reports = Report.query.all()
    return jsonify([{"id": r.id, "title": r.title, "description": r.description, "file_name": r.file_name, "board_id": r.board_id, "user_id": r.user_id} for r in reports])


@reports_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_report():
    user_id = int(get_jwt_identity())
    title = request.form.get("title")
    description = request.form.get("description", "")
    board_id = request.form.get("board_id", 0)
    file = request.files.get("file")
    file_data = file.read() if file else None
    file_name = file.filename if file else ""
    report = Report(title=title, description=description, file_name=file_name, file_data=file_data, board_id=int(board_id) if board_id else None, user_id=user_id)
    db.session.add(report)
    db.session.commit()
    return jsonify({"id": report.id, "title": report.title, "description": report.description, "file_name": report.file_name, "board_id": report.board_id, "user_id": report.user_id}), 201


@reports_bp.route("/download/<int:report_id>", methods=["GET"])
@jwt_required()
def download_report(report_id):
    report = Report.query.get(report_id)
    if report and report.file_data:
        return send_file(BytesIO(report.file_data), download_name=report.file_name, as_attachment=True)
    return jsonify({"error": "File not found"}), 404


@reports_bp.route("/<int:report_id>", methods=["DELETE"])
@jwt_required()
def delete_report(report_id):
    report = Report.query.get(report_id)
    if report:
        db.session.delete(report)
        db.session.commit()
    return jsonify({"ok": True})
