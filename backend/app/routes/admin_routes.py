# app/routes/admin_routes.py

from flask import Blueprint, jsonify, abort
from app.models import User, Store
from http import HTTPStatus
from app.routes.user_routes import serialize_user

admin_api_bp = Blueprint("admin_api", __name__, url_prefix="/api/admin")

@admin_api_bp.route("/dashboard_summary", methods=["GET"])
def get_admin_dashboard_summary():
    # Placeholder values for demonstration since there's no active user
    total_users_in_store = User.query.filter_by(is_deleted=False).count()
    active_users_in_store = User.query.filter_by(is_active=True, is_deleted=False).count()
    total_stores = Store.query.filter_by(is_deleted=False).count()

    return jsonify({
        "message": "Admin dashboard summary",
        "total_users": total_users_in_store,
        "active_users": active_users_in_store,
        "total_stores": total_stores
    }), HTTPStatus.OK

@admin_api_bp.route("/stores/<int:store_id>/users", methods=["GET"])
def admin_get_users_by_store(store_id):
    store = Store.query.get_or_404(store_id)

    allowed_roles = ['clerk', 'cashier']
    users_in_store = User.query.filter(
        User.store_id == store_id,
        User.role.in_(allowed_roles),
        User.is_deleted == False
    ).all()

    return jsonify([serialize_user(user) for user in users_in_store]), HTTPStatus.OK