from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models import User, Store, Product, Purchase
from app.routes.auth_routes import role_required

admin_dashboard = Blueprint("admin_dashboard", __name__, url_prefix="/api/admin-dashboard")

@admin_dashboard.route("/", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_admin_dashboard():
    total_users = User.query.count()
    total_merchants = User.query.filter_by(role="merchant").count()
    total_stores = Store.query.count()
    total_products = Product.query.count()
    total_purchases = Purchase.query.count()

    # Optional: recent purchases
    recent_purchases = Purchase.query.order_by(Purchase.created_at.desc()).limit(5).all()

    return jsonify({
        "total_users": total_users,
        "total_merchants": total_merchants,
        "total_stores": total_stores,
        "total_products": total_products,
        "total_purchases": total_purchases,
        "recent_purchases": [p.to_dict() for p in recent_purchases]
    }), 200
