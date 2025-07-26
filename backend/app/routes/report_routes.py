from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Purchase, Store, User
from app.routes.auth_routes import role_required
from sqlalchemy import func
from datetime import datetime

report_bp = Blueprint("report", __name__, url_prefix="/api/report")

# ✅ Report 1: Total purchases per store (Merchant only)
@report_bp.route("/purchases/total-by-store", methods=["GET"])
@jwt_required()
@role_required("merchant")
def report_total_purchases_by_store():
    user_id = get_jwt_identity()
    stores = Store.query.filter_by(merchant_id=user_id, is_active=True).all()

    result = []
    for store in stores:
        purchases = Purchase.query.filter_by(store_id=store.id).all()
        total = sum(
            sum(item.quantity * item.unit_cost for item in p.purchase_items)
            for p in purchases
        )
        paid = sum(
            sum(item.quantity * item.unit_cost for item in p.purchase_items)
            for p in purchases if p.is_paid
        )
        unpaid = total - paid
        result.append({
            "store_name": store.name,
            "store_id": store.id,
            "total_amount": total,
            "paid": paid,
            "unpaid": unpaid
        })
    return jsonify(result), 200

# ✅ Report 2: Monthly purchase trends (Merchant/Admin)
@report_bp.route("/purchases/monthly-trend", methods=["GET"])
@jwt_required()
@role_required(["merchant", "admin"])
def report_monthly_trends():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    query = Purchase.query
    if user.role == 'admin':
        query = query.filter_by(store_id=user.store_id)
    elif user.role == 'merchant':
        store_ids = [s.id for s in Store.query.filter_by(merchant_id=user.id)]
        query = query.filter(Purchase.store_id.in_(store_ids))

    monthly_data = {}
    for p in query.all():
        month = p.date.strftime('%Y-%m') if p.date else 'unknown'
        total = sum(item.quantity * item.unit_cost for item in p.purchase_items)
        if month not in monthly_data:
            monthly_data[month] = 0
        monthly_data[month] += total

    chart_data = [{"month": m, "total": total} for m, total in sorted(monthly_data.items())]
    return jsonify(chart_data), 200

# ✅ Report 3: Unpaid purchases summary (Admin only)
@report_bp.route("/purchases/unpaid-summary", methods=["GET"])
@jwt_required()
@role_required("admin")
def report_unpaid_summary():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    purchases = Purchase.query.filter_by(store_id=user.store_id, is_paid=False).all()
    total_unpaid = sum(
        sum(item.quantity * item.unit_cost for item in p.purchase_items)
        for p in purchases
    )

    return jsonify({
        "store": user.store.name,
        "total_unpaid": total_unpaid,
        "count": len(purchases)
    }), 200

# ✅ Report 4: Clerk Performance (for charts)
@report_bp.route("/clerk-performance", methods=["GET"])
@jwt_required()
@role_required(["admin", "merchant"])
def clerk_performance():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    query = db.session.query(User.name, func.count(Purchase.id))\
        .join(Purchase, Purchase.clerk_id == User.id)\
        .filter(User.role == 'clerk')

    if user.role == 'admin':
        query = query.filter(Purchase.store_id == user.store_id)
    elif user.role == 'merchant':
        store_ids = [store.id for store in Store.query.filter_by(merchant_id=user.id)]
        query = query.filter(Purchase.store_id.in_(store_ids))

    results = query.group_by(User.name).all()
    data = [{"clerk": row[0], "entries": row[1]} for row in results]
    return jsonify(data), 200

# ✅ Report 5: Payment Status Summary (for charts)
@report_bp.route("/payment-status", methods=["GET"])
@jwt_required()
@role_required(["admin", "merchant"])
def payment_status_summary():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    query = db.session.query(Purchase.payment_status, func.count(Purchase.id))

    if user.role == 'admin':
        query = query.filter(Purchase.store_id == user.store_id)
    elif user.role == 'merchant':
        store_ids = [store.id for store in Store.query.filter_by(merchant_id=user.id)]
        query = query.filter(Purchase.store_id.in_(store_ids))

    results = query.group_by(Purchase.payment_status).all()
    data = [{"status": row[0], "count": row[1]} for row in results]
    return jsonify(data), 200
