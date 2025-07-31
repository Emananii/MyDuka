from flask import Blueprint, jsonify
# from flask_jwt_extended import jwt_required, get_jwt_identity # Commented out for temporary bypass
from app import db
# Ensure Sale, SaleItem, StoreProduct, Product, and Purchase are imported
from app.models import Purchase, Store, User, Sale, SaleItem, StoreProduct, Product
# from app.routes.auth_routes import role_required # Commented out for temporary bypass
from sqlalchemy import func, case, extract # Add extract for date parts
from datetime import datetime, date, timedelta # Add timedelta for date calculations

report_bp = Blueprint("report", __name__, url_prefix="/api/report")

# ✅ Report 1: Total purchases per store (Merchant only)
@report_bp.route("/purchases/total-by-store", methods=["GET"])
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required("merchant") # Uncomment when re-enabling authentication
def report_total_purchases_by_store():
    # TEMPORARY: For testing without auth, fetching all active stores globally
    # In a real scenario with JWT and role_required, you'd filter by the merchant's stores:
    # user_id = get_jwt_identity()
    # merchant_stores = Store.query.filter_by(merchant_id=user_id, is_active=True).all()
    # stores = merchant_stores
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
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required(["merchant", "admin"]) # Uncomment when re-enabling authentication
def report_monthly_trends():
    query = Purchase.query

    # TEMPORARY: Adjust query to fetch all purchases.
    # When authentication is enabled, you'd filter based on user's role/store.
    # user_id = get_jwt_identity()
    # user = User.query.get(user_id)
    # if user and user.role == 'admin' and user.store_id: query = query.filter(Purchase.store_id == user.store_id)
    # elif user and user.role == 'merchant': store_ids = [s.id for s in Store.query.filter_by(merchant_id=user.id)]; query = query.filter(Purchase.store_id.in_(store_ids))

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
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required("admin") # Uncomment when re-enabling authentication
def report_unpaid_summary():
    # TEMPORARY: Fetch all unpaid purchases.
    # When authentication is enabled, you'd filter by the admin's store:
    # user_id = get_jwt_identity()
    # user = User.query.get(user_id)
    # purchases = Purchase.query.filter_by(is_paid=False, store_id=user.store_id).all()
    purchases = Purchase.query.filter_by(is_paid=False).all()

    total_unpaid = sum(
        sum(item.quantity * item.unit_cost for item in p.purchase_items)
        for p in purchases
    )

    store_name_for_response = "All Stores (Temporary)" # Adjusted for temporary testing
    # If filtering by specific store: store_name_for_response = user.store.name if user and user.store else "N/A"
    return jsonify({
        "store": store_name_for_response,
        "total_unpaid": float(total_unpaid), # Convert Decimal to float for JSON
        "count": len(purchases)
    }), 200

# ✅ New Report: Store Specific Stock Performance (Top Products by Sales Volume)
@report_bp.route("/store-stock-performance", methods=["GET"])
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required("admin") # Uncomment when re-enabling authentication - This report is intended for admins of a specific store
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

# ✅ New Report: Sales Performance Trend (Daily) - for both admin/merchant
@report_bp.route("/sales-performance", methods=["GET"])
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required(["admin", "merchant"]) # Uncomment when re-enabling authentication
def sales_performance_trend():
    # TEMPORARY: Simulate filtering by store if needed, or fetch all sales
    # When authentication is re-enabled:
    # user_id = get_jwt_identity()
    # user = User.query.get(user_id)
    
    today = datetime.today()
    six_months_ago = today - timedelta(days=180)

    # Query to get total sales value per day
    sales_trend_query = db.session.query(
        func.date(Sale.created_at).label('sale_date'), # Extract date part from Sale model
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_sales')
    ).join(SaleItem, Sale.id == SaleItem.sale_id)\
    .filter(Sale.created_at >= six_months_ago)\
    .group_by('sale_date')\
    .order_by('sale_date')

    # Add filtering by store if user is admin/merchant (uncomment when auth is back)
    # if user and user.role == 'admin' and user.store_id:
    #     sales_trend_query = sales_trend_query.filter(Sale.store_id == user.store_id)
    # elif user and user.role == 'merchant':
    #     store_ids = [s.id for s in Store.query.filter_by(merchant_id=user.id)]
    #     if store_ids:
    #         sales_trend_query = sales_trend_query.filter(Sale.store_id.in_(store_ids))
    #     else:
    #         return jsonify({"message": "No stores associated with this merchant."}), 404


    results = sales_trend_query.all()

    # Format data for the chart
    chart_data = [
        {
            "date": sale_date.strftime('%Y-%m-%d'), # Format as YYYY-MM-DD for JS Date parsing
            "value": float(total_sales) # Convert Decimal to float
        }
        for sale_date, total_sales in results
    ]

    if not chart_data:
        return jsonify({"message": "No sales performance data available for the last 6 months."}), 404

    return jsonify(chart_data), 200

# ✅ Report 5: Payment Status Summary (for charts)
# Now uses the `is_paid` boolean column
@report_bp.route("/payment-status", methods=["GET"])
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required(["admin", "merchant"]) # Uncomment when re-enabling authentication
def payment_status_summary():
    # TEMPORARY: Fetch payment status across all purchases.
    # When authentication is enabled, filter by user's associated stores.
    # user_id = get_jwt_identity()
    # user = User.query.get(user_id)
    # query = Purchase.query
    # if user and user.role == 'admin' and user.store_id:
    #     query = query.filter(Purchase.store_id == user.store_id)
    # elif user and user.role == 'merchant':
    #     store_ids = [s.id for s in Store.query.filter_by(merchant_id=user.id)]
    #     if store_ids:
    #         query = query.filter(Purchase.store_id.in_(store_ids))
    #     else:
    #         return jsonify({"message": "No stores associated with this merchant."}), 404

    results = db.session.query(
        case(
            (Purchase.is_paid == True, 'Paid'),
            (Purchase.is_paid == False, 'Unpaid')
        ).label('status'),
        func.count(Purchase.id).label('count')
    ).group_by('status').all() # Use 'results = query.group_by('status').all()' when filtering

    data = [{"status": row.status, "count": row.count} for row in results]
    return jsonify(data), 200


# ✅ NEW Report: Profit Performance Trend (Daily) for Admin
@report_bp.route("/profit-performance", methods=["GET"])
# @jwt_required() # Uncomment when re-enabling authentication
# @role_required("admin") # Profit trend is typically for overall admin oversight
def profit_performance_trend():
    # When authentication is re-enabled for admin:
    # user_id = get_jwt_identity()
    # user = User.query.get(user_id)
    # if not user or user.role != 'admin':
    #     return jsonify({"message": "Unauthorized access."}), 403

    today = datetime.today()
    six_months_ago = today - timedelta(days=180)

    # Query to calculate daily profit: (SaleItem.quantity * SaleItem.price_at_sale) - (SaleItem.quantity * Product.cost_price)
    # This requires joining Sale -> SaleItem -> StoreProduct -> Product
    profit_trend_query = db.session.query(
        func.date(Sale.created_at).label('sale_date'),
        (
            func.sum(SaleItem.quantity * SaleItem.price_at_sale) -
            func.sum(SaleItem.quantity * Product.cost_price)
        ).label('total_profit')
    ).join(SaleItem, Sale.id == SaleItem.sale_id)\
    .join(StoreProduct, SaleItem.store_product_id == StoreProduct.id)\
    .join(Product, StoreProduct.product_id == Product.id)\
    .filter(Sale.created_at >= six_months_ago)\
    .group_by('sale_date')\
    .order_by('sale_date')

    # If the admin is tied to a specific store and you only want that store's profit:
    # if user.store_id:
    #     profit_trend_query = profit_trend_query.filter(Sale.store_id == user.store_id)

    results = profit_trend_query.all()

    chart_data = [
        {
            "date": sale_date.strftime('%Y-%m-%d'),
            "value": float(total_profit) if total_profit is not None else 0.0 # Handle cases where profit might be null
        }
        for sale_date, total_profit in results
    ]

    if not chart_data:
        return jsonify({"message": "No profit data available for the last 6 months."}), 404

    return jsonify(chart_data), 200