# backend/routes/asset_routes.py
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models import Asset, db
from utils.authz import roles_required

asset_bp = Blueprint("assets", __name__, url_prefix="/api/assets")

VALID_ASSET_STATUSES = {"operational", "maintenance", "out_of_service"}


@asset_bp.get("")
@jwt_required()
def list_assets():
    status_filter = (request.args.get("status") or "").strip().lower()
    search_query = (request.args.get("q") or "").strip().lower()

    query = Asset.query

    if status_filter and status_filter != "all":
        if status_filter not in VALID_ASSET_STATUSES:
            return jsonify({"message": "Invalid status filter."}), 400
        query = query.filter(Asset.status == status_filter)

    assets = query.order_by(Asset.code.asc()).all()

    if search_query:
        assets = [
            a
            for a in assets
            if search_query in a.code.lower()
            or search_query in a.name.lower()
            or search_query in a.location.lower()
        ]

    return jsonify({"assets": [a.to_dict() for a in assets]}), 200


@asset_bp.post("")
@roles_required("admin", "technician")
def create_asset():
    data = request.get_json(silent=True) or {}

    code = (data.get("code") or "").strip().upper()
    name = (data.get("name") or "").strip()
    location = (data.get("location") or "").strip()
    status = (data.get("status") or "operational").strip().lower()

    if not code or not name or not location:
        return jsonify({"message": "Code, name, and location are required."}), 400

    if status not in VALID_ASSET_STATUSES:
        return jsonify({"message": "Invalid asset status."}), 400

    if Asset.query.filter_by(code=code).first():
        return jsonify({"message": f"Asset with code '{code}' already exists."}), 409

    asset = Asset(
        code=code,
        name=name,
        location=location,
        status=status,
        last_maintenance_at=datetime.now(timezone.utc) if status == "maintenance" else None,
    )

    db.session.add(asset)
    db.session.commit()

    return jsonify({"asset": asset.to_dict()}), 201


@asset_bp.patch("/<int:asset_id>")
@roles_required("admin", "technician")
def update_asset(asset_id):
    asset = Asset.query.get(asset_id)
    if not asset:
        return jsonify({"message": "Asset not found."}), 404

    data = request.get_json(silent=True) or {}

    if "status" in data:
        next_status = (data.get("status") or "").strip().lower()
        if next_status not in VALID_ASSET_STATUSES:
            return jsonify({"message": "Invalid asset status."}), 400
        asset.status = next_status
        if next_status in {"maintenance", "operational"}:
            asset.last_maintenance_at = datetime.now(timezone.utc)

    if "location" in data:
        next_location = (data.get("location") or "").strip()
        if not next_location:
            return jsonify({"message": "Location cannot be empty."}), 400
        asset.location = next_location

    db.session.commit()
    return jsonify({"asset": asset.to_dict()}), 200