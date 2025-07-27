from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, StoreProduct, Purchase, Store, PurchaseItem, Product
from app.routes.auth_routes import role_required
from sqlalchemy import func
from app import db

merchant_dashboard = Blueprint("merchant_dashboard", __name__, url_prefix="/api/merchant-dashboard")

@merchant_dashboard.route("/", methods=["GET"])
@jwt_required()
@role_required("merchant")
def get_merchant_dashboard():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.store_id:
        return jsonify({"error": "Merchant has no assigned store"}), 400

    store_id = user.store_id

    # Total products
    product_count = StoreProduct.query.filter_by(store_id=store_id).count()

    # Total stock value
    total_value = db.session.query(func.sum(StoreProduct.price * StoreProduct.quantity_in_stock))\
        .filter(StoreProduct.store_id == store_id).scalar() or 0

    # Total purchases
    purchase_count = Purchase.query.filter_by(store_id=store_id).count()

    # Recent purchases
    recent_purchases = Purchase.query.filter_by(store_id=store_id)\
        .order_by(Purchase.created_at.desc()).limit(5).all()

    data = {
        "product_count": product_count,
        "total_stock_value": float(total_value),
        "purchase_count": purchase_count,
        "recent_purchases": [p.to_dict() for p in recent_purchases],
    }

    return jsonify(data), 200
