# backend/seed.py
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash
from app import app
from models import Asset, MaintenanceLog, MaintenanceNote, User, db


def utc_now():
    return datetime.now(timezone.utc)


def seed_database():
    with app.app_context():
        db.create_all()

        # 1. Users (one per role)
        users_data = [
            {
                "name": "Admin User",
                "email": "admin@mainttrack.local",
                "password": "Password123!",
                "role": "admin",
            },
            {
                "name": "Technician User",
                "email": "tech@mainttrack.local",
                "password": "Password123!",
                "role": "technician",
            },
            {
                "name": "Viewer User",
                "email": "viewer@mainttrack.local",
                "password": "Password123!",
                "role": "viewer",
            },
        ]

        users_by_email = {}
        for item in users_data:
            existing = User.query.filter_by(email=item["email"]).first()
            if not existing:
                existing = User(
                    name=item["name"],
                    email=item["email"],
                    password_hash=generate_password_hash(item["password"]),
                    role=item["role"],
                )
                db.session.add(existing)
                db.session.flush()
            users_by_email[item["email"]] = existing

        # 2. Assets
        assets_data = [
            {
                "code": "MCH-01",
                "name": "CNC Press #1",
                "location": "Bay A - North",
                "status": "operational",
                "last_maintenance_at": utc_now() - timedelta(days=20),
            },
            {
                "code": "MCH-04",
                "name": "Hydraulic Shear #4",
                "location": "Bay B - East",
                "status": "maintenance",
                "last_maintenance_at": utc_now() - timedelta(days=4),
            },
            {
                "code": "CONV-02",
                "name": "Conveyor Line B",
                "location": "Assembly Line 2",
                "status": "out_of_service",
                "last_maintenance_at": utc_now() - timedelta(days=12),
            },
        ]

        assets_by_code = {}
        for item in assets_data:
            existing = Asset.query.filter_by(code=item["code"]).first()
            if not existing:
                existing = Asset(
                    code=item["code"],
                    name=item["name"],
                    location=item["location"],
                    status=item["status"],
                    last_maintenance_at=item["last_maintenance_at"],
                )
                db.session.add(existing)
                db.session.flush()
            assets_by_code[item["code"]] = existing

        # 3. Maintenance Logs & Notes
        admin = users_by_email["admin@mainttrack.local"]
        tech = users_by_email["tech@mainttrack.local"]
        viewer = users_by_email["viewer@mainttrack.local"]

        logs_data = [
            {
                "title": "Hydraulic pressure drop during cycle",
                "asset_code": "MCH-04",
                "reported_by_id": viewer.id,
                "assigned_to_id": tech.id,
                "description": "Pressure drops below threshold after 15 continuous cutting cycles.",
                "root_cause": "Worn relief valve seal",
                "priority": "high",
                "status": "in_progress",
                "resolved_at": None,
                "notes": [
                    (
                        tech.id,
                        "Checked hydraulic manifold and pressure gauge; relief valve seal shows wear under load.",
                    )
                ],
            },
            {
                "title": "Belt motor overheating under load",
                "asset_code": "CONV-02",
                "reported_by_id": viewer.id,
                "assigned_to_id": tech.id,
                "description": "Motor thermal trip triggered twice during morning shift.",
                "root_cause": "",
                "priority": "critical",
                "status": "open",
                "resolved_at": None,
                "notes": [
                    (
                        viewer.id,
                        "Conveyor stopped twice on Line B; motor housing felt hot to touch.",
                    )
                ],
            },
            {
                "title": "Scheduled limit switch calibration",
                "asset_code": "MCH-01",
                "reported_by_id": admin.id,
                "assigned_to_id": tech.id,
                "description": "Routine alignment and sensor response check on axis X.",
                "root_cause": "Preventative calibration",
                "priority": "low",
                "status": "resolved",
                "resolved_at": utc_now() - timedelta(days=8),
                "notes": [
                    (
                        tech.id,
                        "Calibrated X-axis limit switch and verified signal repeatability.",
                    )
                ],
            },
        ]

        for entry in logs_data:
            existing_log = MaintenanceLog.query.filter_by(title=entry["title"]).first()
            if not existing_log:
                asset = assets_by_code[entry["asset_code"]]
                log = MaintenanceLog(
                    asset_id=asset.id,
                    reported_by_id=entry["reported_by_id"],
                    assigned_to_id=entry["assigned_to_id"],
                    title=entry["title"],
                    description=entry["description"],
                    root_cause=entry["root_cause"],
                    priority=entry["priority"],
                    status=entry["status"],
                    resolved_at=entry["resolved_at"],
                )
                db.session.add(log)
                db.session.flush()

                for author_id, note_text in entry["notes"]:
                    db.session.add(
                        MaintenanceNote(
                            log_id=log.id,
                            author_id=author_id,
                            note=note_text,
                        )
                    )

        db.session.commit()
        print("Database seeded successfully.")


if __name__ == "__main__":
    seed_database()