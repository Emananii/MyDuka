from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from app import db
from app.models import User, Store, Product, Purchase
from app.routes.auth_routes import role_required


dashboard = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# 1. Summary chart data
@dashboard.route("/summary", methods=["GET", "OPTIONS"])
@jwt_required()
@role_required("admin")
def dashboard_summary():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

# 2. Inventory movements (monthly purchase count)
@dashboard.route("/movements", methods=["GET", "OPTIONS"])
@jwt_required()
@role_required("admin")
def inventory_movements():
    today = datetime.today()
    six_months_ago = today - timedelta(days=180)

    data = (
        db.session.query(
            extract('year', Purchase.created_at).label('year'),
            extract('month', Purchase.created_at).label('month'),
            func.count(Purchase.id).label('purchase_count')
        )
        .filter(Purchase.created_at >= six_months_ago)
        .group_by('year', 'month')
        .order_by('year', 'month')
        .all()
    )

    result = [
        {
            "month": f"{int(month):02d}-{int(year)}",
            "purchases": purchase_count
        }
        for year, month, purchase_count in data
    ]

    return jsonify(result), 200

# 3. Clerk performance (mock data)
@dashboard.route("/clerks/performance", methods=["GET"])
@jwt_required()
@role_required("admin")
def clerk_performance():
    mock_data = [
        {"name": "Alice", "sales": 120},
        {"name": "Bob", "sales": 95},
        {"name": "Carol", "sales": 150},
        {"name": "Dan", "sales": 80}
    ]
    return jsonify(mock_data), 200

# 4. Payment status (mock data)
@dashboard.route("/payments/status", methods=["GET"])
@jwt_required()
@role_required("admin")
def payment_status():
    mock_data = [
        {"status": "Paid", "count": 320},
        {"status": "Pending", "count": 85}
    ]
    return jsonify(mock_data), 200
