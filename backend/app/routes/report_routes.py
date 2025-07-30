from flask import Blueprint, jsonify
# from flask_jwt_extended import jwt_required, get_jwt_identity # Commented out for temporary bypass
from app import db
from app.models import Purchase, Store, User, SaleItem, StoreProduct, Product # Make sure SaleItem, StoreProduct, Product are imported
# from app.routes.auth_routes import role_required # Commented out for temporary bypass
from sqlalchemy import func, case
from datetime import datetime, date

report_bp = Blueprint("report", __name__, url_prefix="/api/report")

# ✅ Report 1: Total purchases per store (Merchant only)
@report_bp.route("/purchases/total-by-store", methods=["GET"])
# @jwt_required() # Commented out
# @role_required("merchant") # Commented out
def report_total_purchases_by_store():
    # TEMPORARY: For testing without auth, adjust queries to fetch all stores or simulate a specific merchant
    # For now, fetching all stores globally for demonstration:
    stores = Store.query.filter_by(is_active=True).all()

    result = []
    for store in stores:
        purchases = Purchase.query.filter_by(store_id=store.id).all()
        # Ensure 'item.unit_cost' is correctly handled as Decimal
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
            "total_amount": float(total), # Convert Decimal to float for JSON
            "paid": float(paid),         # Convert Decimal to float for JSON
            "unpaid": float(unpaid)       # Convert Decimal to float for JSON
        })
    return jsonify(result), 200

# ✅ Report 2: Monthly purchase trends (Merchant/Admin)
@report_bp.route("/purchases/monthly-trend", methods=["GET"])
# @jwt_required() # Commented out
# @role_required(["merchant", "admin"]) # Commented out
def report_monthly_trends():
    # TEMPORARY: Adjust query to fetch all purchases or specific ones for testing without auth
    query = Purchase.query

    monthly_data = {}
    for p in query.all():
        # Use p.date, which is a date object, so strftime is suitable
        month = p.date.strftime('%Y-%m') if p.date else 'unknown'
        total = sum(item.quantity * item.unit_cost for item in p.purchase_items)
        if month not in monthly_data:
            monthly_data[month] = 0
        monthly_data[month] += total

    chart_data = [{"month": m, "total": float(total)} for m, total in sorted(monthly_data.items())] # Convert to float
    return jsonify(chart_data), 200

# ✅ Report 3: Unpaid purchases summary (Admin only)
@report_bp.route("/purchases/unpaid-summary", methods=["GET"])
# @jwt_required() # Commented out
# @role_required("admin") # Commented out
def report_unpaid_summary():
    # TEMPORARY: Adjust query to fetch all unpaid purchases or for a specific store
    purchases = Purchase.query.filter_by(is_paid=False).all()

    total_unpaid = sum(
        sum(item.quantity * item.unit_cost for item in p.purchase_items)
        for p in purchases
    )

    store_name_for_response = "All Stores (Temporary)" # Adjusted for temporary testing
    return jsonify({
        "store": store_name_for_response,
        "total_unpaid": float(total_unpaid), # Convert Decimal to float for JSON
        "count": len(purchases)
    }), 200

# ✅ New Report: Store Specific Stock Performance (Top Products by Sales Volume)
@report_bp.route("/store-stock-performance", methods=["GET"])
# @jwt_required() # Commented out
# @role_required("admin") # Commented out - This report is intended for admins of a specific store
def store_stock_performance():
    # TEMPORARY: Simulate admin's store_id since authentication is commented out.
    # In a real scenario with JWT and role_required, you would get the user's store_id like this:
    # user_id = get_jwt_identity()
    # user = User.query.get(user_id)
    # if not user or not user.store_id:
    #     return jsonify({"message": "User not associated with a store or not found."}), 404
    # admin_store_id = user.store_id

    # For temporary testing, hardcode a store ID. Replace with an ID from your seeded data.
    # Example: store_main.id (which is likely 1 if you seeded in order)
    admin_store_id = 1 # IMPORTANT: Change this to a valid store ID from your database for testing!
    
    # Query to get top products by total quantity sold in the admin's store
    # We join SaleItem -> StoreProduct -> Product
    top_products_query = db.session.query(
        Product.name,
        func.sum(SaleItem.quantity).label('total_quantity_sold')
    ).join(StoreProduct, SaleItem.store_product_id == StoreProduct.id)\
    .join(Product, StoreProduct.product_id == Product.id)\
    .filter(StoreProduct.store_id == admin_store_id)\
    .group_by(Product.name)\
    .order_by(func.sum(SaleItem.quantity).desc())\
    .limit(10) # Get top 10 products

    results = top_products_query.all()

    # Format results for a bar graph
    data = [{"product_name": name, "sales_volume": int(total_quantity_sold)} for name, total_quantity_sold in results]

    if not data:
        return jsonify({"message": f"No sales data found for store ID {admin_store_id}."}), 404

    return jsonify(data), 200


# ✅ Report 5: Payment Status Summary (for charts)
# Now uses the `is_paid` boolean column
@report_bp.route("/payment-status", methods=["GET"])
# @jwt_required() # Commented out
# @role_required(["admin", "merchant"]) # Commented out
def payment_status_summary():
    # TEMPORARY: Remove or adjust the user-based filtering
    # To get payment status across all stores:
    # We'll group by a derived status (Paid/Unpaid) using case statement

    results = db.session.query(
        case(
            (Purchase.is_paid == True, 'Paid'),
            (Purchase.is_paid == False, 'Unpaid')
        ).label('status'),
        func.count(Purchase.id).label('count')
    ).group_by('status').all()

    # If you need to simulate for a specific store/merchant without auth:
    # test_store_id = 1 # Replace with an actual store ID from your database
    # results = db.session.query(
    #     case(
    #         (Purchase.is_paid == True, 'Paid'),
    #         (Purchase.is_paid == False, 'Unpaid')
    #     ).label('status'),
    #     func.count(Purchase.id).label('count')
    # ).filter(Purchase.store_id == test_store_id).group_by('status').all()

    data = [{"status": row.status, "count": row.count} for row in results]
    return jsonify(data), 200