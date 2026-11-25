# backend/models.py
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="viewer")  # admin | technician | viewer
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    reported_logs = db.relationship(
        "MaintenanceLog",
        foreign_keys="MaintenanceLog.reported_by_id",
        back_populates="reported_by",
        lazy=True,
    )
    assigned_logs = db.relationship(
        "MaintenanceLog",
        foreign_keys="MaintenanceLog.assigned_to_id",
        back_populates="assigned_to",
        lazy=True,
    )
    notes = db.relationship("MaintenanceNote", back_populates="author", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
        }


class Asset(db.Model):
    __tablename__ = "assets"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    status = db.Column(
        db.String(30), nullable=False, default="operational"
    )  # operational | maintenance | out_of_service
    last_maintenance_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    logs = db.relationship(
        "MaintenanceLog",
        back_populates="asset",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "location": self.location,
            "status": self.status,
            "last_maintenance_at": (
                self.last_maintenance_at.strftime("%Y-%m-%d")
                if self.last_maintenance_at
                else None
            ),
        }


class MaintenanceLog(db.Model):
    __tablename__ = "maintenance_logs"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("assets.id"), nullable=False, index=True)
    reported_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    root_cause = db.Column(db.Text, nullable=True, default="")
    priority = db.Column(
        db.String(20), nullable=False, default="medium"
    )  # low | medium | high | critical
    status = db.Column(
        db.String(20), nullable=False, default="open"
    )  # open | in_progress | resolved

    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)

    asset = db.relationship("Asset", back_populates="logs")
    reported_by = db.relationship(
        "User", foreign_keys=[reported_by_id], back_populates="reported_logs"
    )
    assigned_to = db.relationship(
        "User", foreign_keys=[assigned_to_id], back_populates="assigned_logs"
    )
    notes = db.relationship(
        "MaintenanceNote",
        back_populates="log",
        order_by="desc(MaintenanceNote.created_at)",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self, include_notes=False):
        data = {
            "id": self.id,
            "asset_id": self.asset_id,
            "asset_code": self.asset.code if self.asset else None,
            "asset_name": self.asset.name if self.asset else None,
            "title": self.title,
            "description": self.description,
            "root_cause": self.root_cause or "",
            "priority": self.priority,
            "status": self.status,
            "reported_by": self.reported_by.name if self.reported_by else None,
            "assigned_to": self.assigned_to.name if self.assigned_to else None,
            "created_at": self.created_at.strftime("%Y-%m-%d"),
            "resolved_at": (
                self.resolved_at.strftime("%Y-%m-%d") if self.resolved_at else None
            ),
        }
        if include_notes:
            data["notes"] = [note.to_dict() for note in self.notes]
        return data


class MaintenanceNote(db.Model):
    __tablename__ = "maintenance_notes"

    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(
        db.Integer, db.ForeignKey("maintenance_logs.id"), nullable=False, index=True
    )
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    note = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    log = db.relationship("MaintenanceLog", back_populates="notes")
    author = db.relationship("User", back_populates="notes")

    def to_dict(self):
        return {
            "id": self.id,
            "author": self.author.name if self.author else "System",
            "role": self.author.role if self.author else "technician",
            "note": self.note,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }