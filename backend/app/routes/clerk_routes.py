# backend/routes/clerk_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, User
from utils import admin_required

clerk_bp = Blueprint("clerk_routes", __name__, url_prefix="/api/clerks")

# Admin: Get all clerks
@clerk_bp.route("/", methods=["GET"])
@jwt_required()
@admin_required
def get_clerks():
    clerks = User.query.filter_by(role="clerk").all()
    return jsonify([clerk.to_dict() for clerk in clerks]), 200

# Admin: Activate clerk
@clerk_bp.route("/<int:user_id>/activate", methods=["PATCH"])
@jwt_required()
@admin_required
def activate_clerk(user_id):
    clerk = User.query.get_or_404(user_id)
    clerk.is_active = True
    db.session.commit()
    return jsonify({"message": "Clerk activated"}), 200

# Admin: Deactivate clerk
@clerk_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
@admin_required
def deactivate_clerk(user_id):
    clerk = User.query.get_or_404(user_id)
    clerk.is_active = False
    db.session.commit()
    return jsonify({"message": "Clerk deactivated"}), 200

# Admin: Delete clerk
@clerk_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_clerk(user_id):
    clerk = User.query.get_or_404(user_id)
    db.session.delete(clerk)
    db.session.commit()
    return jsonify({"message": "Clerk deleted"}), 200
