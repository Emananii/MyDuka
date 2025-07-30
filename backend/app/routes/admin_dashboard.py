from flask import Blueprint, jsonify, request
# Removed: from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from app import db
from app.models import User, Store, Product, Purchase
# Removed: from app.routes.auth_routes import role_required # No longer needed if role_required isn't used

# --- CRITICAL FIX 1: Correct url_prefix for the blueprint ---
# It should be "/api/dashboard" so that routes like /api/dashboard/movements work correctly.
dashboard = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# 1. Summary Chart Data
# Removed @jwt_required() and @role_required("admin")
@dashboard.route("/summary", methods=["GET", "OPTIONS"])
def dashboard_summary():
    total_products = db.session.query(Product).count()
    total_stores = db.session.query(Store).count()
    total_purchases = db.session.query(Purchase).count()

    # --- CRITICAL FIX 2: Correct attribute for User role ---
    # Assuming your User model has a 'role' column that stores the role name as a string (e.g., 'clerk').
    # If your User model uses a 'role_id' and links to a separate Role table, you'll need to adjust this
    # to join with the Role table (e.g., User.role_rel.has(Role.name=='clerk')).
    # For now, this assumes a direct 'role' string column.
    active_clerks = db.session.query(User).filter_by(is_deleted=False, role="clerk").count()

    return jsonify({
        "total_products": total_products,
        "total_stores": total_stores,
        "total_purchases": total_purchases,
        "active_clerks": active_clerks
    }), 200

# 2. Inventory Movements Chart (last 6 months)
# Removed @jwt_required() and @role_required("admin")
@dashboard.route("/movements", methods=["GET", "OPTIONS"])
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
            # --- CRITICAL FIX 3: Change date format for JavaScript compatibility ---
            # Format as "YYYY-MM-DD" (e.g., "2025-07-01") for reliable parsing by new Date() in JS.
            "month": f"{int(year)}-{int(month):02d}-01",
            "purchases": purchase_count
        }
        for year, month, purchase_count in data
    ]

    return jsonify(result), 200

# 3. Clerk Performance (Mock or Real)
# Removed @jwt_required() and @role_required("admin")
# --- FIX 4: Correct route path to match frontend (assuming frontend uses hyphens) ---
@dashboard.route("/clerks-performance", methods=["GET", "OPTIONS"])
def clerk_performance():
    # Replace with real logic if available
    mock_data = [
        {"name": "Alice", "sales": 120},
        {"name": "Bob", "sales": 95},
        {"name": "Carol", "sales": 150},
        {"name": "Dan", "sales": 80}
    ]
    return jsonify(mock_data), 200

# 4. Payment Status Summary (Mock or Real)
# Removed @jwt_required() and @role_required("admin")
# --- FIX 5: Correct route path to match frontend (assuming frontend uses hyphens) ---
@dashboard.route("/payment-status", methods=["GET", "OPTIONS"])
def payment_status():
    # Replace with real logic if needed
    mock_data = [
        {"status": "Paid", "count": 320},
        {"status": "Pending", "count": 85}
    ]
    return jsonify(mock_data), 200