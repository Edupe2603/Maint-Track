# backend/routes/log_routes.py
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import Asset, MaintenanceLog, MaintenanceNote, User, db
from utils.authz import roles_required

log_bp = Blueprint("logs", __name__, url_prefix="/api/logs")

VALID_LOG_STATUSES = {"open", "in_progress", "resolved"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}


@log_bp.get("")
@jwt_required()
def list_logs():
    status_filter = (request.args.get("status") or "").strip().lower()
    priority_filter = (request.args.get("priority") or "").strip().lower()
    search_query = (request.args.get("q") or "").strip().lower()

    query = MaintenanceLog.query

    if status_filter and status_filter != "all":
        if status_filter not in VALID_LOG_STATUSES:
            return jsonify({"message": "Invalid status filter."}), 400
        query = query.filter(MaintenanceLog.status == status_filter)

    if priority_filter and priority_filter != "all":
        if priority_filter not in VALID_PRIORITIES:
            return jsonify({"message": "Invalid priority filter."}), 400
        query = query.filter(MaintenanceLog.priority == priority_filter)

    logs = query.order_by(MaintenanceLog.created_at.desc()).all()

    if search_query:
        logs = [
            item
            for item in logs
            if search_query in item.title.lower()
            or search_query in item.description.lower()
            or (item.asset and search_query in item.asset.code.lower())
            or (item.asset and search_query in item.asset.name.lower())
        ]

    return jsonify({"logs": [item.to_dict(include_notes=False) for item in logs]}), 200


@log_bp.post("")
@jwt_required()
def create_log():
    current_user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    asset_id = data.get("asset_id")
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    priority = (data.get("priority") or "medium").strip().lower()
    assigned_to_id = data.get("assigned_to_id")

    if not asset_id or not title or not description:
        return jsonify({"message": "asset_id, title, and description are required."}), 400

    if priority not in VALID_PRIORITIES:
        return jsonify({"message": "Invalid priority level."}), 400

    asset = Asset.query.get(asset_id)
    if not asset:
        return jsonify({"message": "Referenced asset does not exist."}), 404

    if assigned_to_id is not None:
        assignee = User.query.get(assigned_to_id)
        if not assignee:
            return jsonify({"message": "Assigned user does not exist."}), 404

    log = MaintenanceLog(
        asset_id=asset.id,
        reported_by_id=current_user_id,
        assigned_to_id=assigned_to_id,
        title=title,
        description=description,
        priority=priority,
        status="open",
    )

    db.session.add(log)
    db.session.commit()

    return jsonify({"log": log.to_dict(include_notes=True)}), 201


@log_bp.get("/<int:log_id>")
@jwt_required()
def get_log_detail(log_id):
    log = MaintenanceLog.query.get(log_id)
    if not log:
        return jsonify({"message": "Maintenance log not found."}), 404

    return jsonify({"log": log.to_dict(include_notes=True)}), 200


@log_bp.patch("/<int:log_id>")
@roles_required("admin", "technician")
def update_log(log_id):
    log = MaintenanceLog.query.get(log_id)
    if not log:
        return jsonify({"message": "Maintenance log not found."}), 404

    data = request.get_json(silent=True) or {}

    if "status" in data:
        next_status = (data.get("status") or "").strip().lower()
        if next_status not in VALID_LOG_STATUSES:
            return jsonify({"message": "Invalid status value."}), 400
        log.status = next_status
        if next_status == "resolved" and not log.resolved_at:
            log.resolved_at = datetime.now(timezone.utc)
        elif next_status != "resolved":
            log.resolved_at = None

    if "root_cause" in data:
        log.root_cause = (data.get("root_cause") or "").strip()

    if "assigned_to_id" in data:
        assignee_id = data.get("assigned_to_id")
        if assignee_id is None:
            log.assigned_to_id = None
        else:
            assignee = User.query.get(assignee_id)
            if not assignee:
                return jsonify({"message": "Assigned user does not exist."}), 404
            log.assigned_to_id = assignee.id

    db.session.commit()
    return jsonify({"log": log.to_dict(include_notes=True)}), 200


@log_bp.post("/<int:log_id>/notes")
@roles_required("admin", "technician")
def add_log_note(log_id):
    log = MaintenanceLog.query.get(log_id)
    if not log:
        return jsonify({"message": "Maintenance log not found."}), 404

    data = request.get_json(silent=True) or {}
    note_text = (data.get("note") or "").strip()

    if not note_text:
        return jsonify({"message": "Note content cannot be empty."}), 400

    author_id = int(get_jwt_identity())
    note_entry = MaintenanceNote(
        log_id=log.id,
        author_id=author_id,
        note=note_text,
    )

    db.session.add(note_entry)
    db.session.commit()

    return jsonify({"note_item": note_entry.to_dict()}), 201