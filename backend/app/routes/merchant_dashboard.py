from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.routes.auth_routes import role_required
from app.models import db, Product, StoreProduct, Purchase, StockTransfer, PurchaseItem, StockTransferItem, Supplier, User, Store, Sale, SaleItem
from sqlalchemy import func, distinct, cast, String, Date
from datetime import datetime, timedelta
from decimal import Decimal

# Define the blueprint with the URL prefix for dashboard routes
merchant_dashboard_bp = Blueprint('merchant_dashboard', __name__, url_prefix='/dashboard')

# The get_merchant_stores_ids helper is no longer needed
# as the merchant role is a superuser and can view all stores directly.

@merchant_dashboard_bp.route('/summary', methods=['GET'])
# @jwt_required()
# @role_required("merchant") # Only merchants can access this dashboard summary
def get_merchant_dashboard_summary():
    """
    Fetches summary statistics for the merchant dashboard.
    As a superuser, the merchant can view data across all active stores by default,
    or filter by a specific store using the 'store_id' query parameter.
    """
    selected_store_id_param = request.args.get('store_id')

    # Start with all active store IDs in the system
    all_active_store_ids = [s.id for s in Store.query.filter_by(is_deleted=False).all()]

    if not all_active_store_ids:
        # If there are no active stores at all, return empty dashboard data
        return jsonify({
            "total_items": 0, "total_stock": 0, "low_stock_count": 0, "out_of_stock_count": 0,
            "low_stock_items": [], "out_of_stock_items": [], "in_stock_items": [],
            "recent_purchases": [], "recent_transfers": [], "inventory_value": 0.0,
            "total_purchase_value": 0.0, "supplier_spending_trends": []
        }), 200

    # Determine the store IDs to query against based on selected_store_id_param
    query_store_ids = []
    if selected_store_id_param and selected_store_id_param.lower() != 'all':
        try:
            selected_store_id_int = int(selected_store_id_param)
            # Ensure the requested store ID is valid and active
            if selected_store_id_int not in all_active_store_ids:
                abort(404, description="Store not found or is inactive.")
            query_store_ids = [selected_store_id_int]
        except ValueError:
            abort(400, description="Invalid 'store_id' provided. Must be an integer or 'all'.")
    else:
        # If 'all' or no store_id is provided, query all active stores
        query_store_ids = all_active_store_ids

    # --- Construct dynamic filter conditions ---
    # These filters will be used in the queries below
    store_product_filter_condition = StoreProduct.store_id.in_(query_store_ids)
    purchase_filter_condition = Purchase.store_id.in_(query_store_ids)
    sale_filter_condition = Sale.store_id.in_(query_store_ids)
    
    # For transfers, we need to check both from_store_id and to_store_id
    transfer_filter_condition = (
        (StockTransfer.from_store_id.in_(query_store_ids)) |
        (StockTransfer.to_store_id.in_(query_store_ids))
    )

    # --- Data Aggregation ---

    # Total Items
    total_items = db.session.query(func.count(distinct(StoreProduct.product_id)))\
        .filter(store_product_filter_condition, StoreProduct.is_deleted == False)\
        .scalar() or 0

    # Total Stock
    total_stock_query = db.session.query(func.sum(StoreProduct.quantity_in_stock))\
        .filter(store_product_filter_condition, StoreProduct.is_deleted == False)
    total_stock = total_stock_query.scalar() or 0

    # Low Stock Items
    low_stock_store_products = StoreProduct.query.filter(
        store_product_filter_condition,
        StoreProduct.quantity_in_stock <= StoreProduct.low_stock_threshold,
        StoreProduct.quantity_in_stock > 0,
        StoreProduct.is_deleted == False
    ).all()
    low_stock_count = len(low_stock_store_products)
    low_stock_items_data = []
    for sp in low_stock_store_products:
        product = Product.query.get(sp.product_id)
        if product:
            low_stock_items_data.append({
                "id": product.id,
                "name": product.name,
                "stock_level": sp.quantity_in_stock,
                "threshold": sp.low_stock_threshold,
                "store_name": sp.store.name if sp.store else "N/A" # Include store name for clarity
            })

    # Out of Stock Items
    out_of_stock_store_products = StoreProduct.query.filter(
        store_product_filter_condition,
        StoreProduct.quantity_in_stock == 0,
        StoreProduct.is_deleted == False
    ).all()
    out_of_stock_count = len(out_of_stock_store_products)
    out_of_stock_items_data = []
    for sp in out_of_stock_store_products:
        product = Product.query.get(sp.product_id)
        if product:
            out_of_stock_items_data.append({
                "id": product.id,
                "name": product.name,
                "stock_level": sp.quantity_in_stock,
                "store_name": sp.store.name if sp.store else "N/A" # Include store name for clarity
            })

    # In Stock Items (a few examples)
    in_stock_store_products = StoreProduct.query.filter(
        store_product_filter_condition,
        StoreProduct.quantity_in_stock > StoreProduct.low_stock_threshold,
        StoreProduct.is_deleted == False
    ).limit(5).all() # Limit to avoid fetching too much data
    in_stock_items_data = []
    for sp in in_stock_store_products:
        product = Product.query.get(sp.product_id)
        if product:
            in_stock_items_data.append({
                "id": product.id,
                "name": product.name,
                "stock_level": sp.quantity_in_stock,
                "store_name": sp.store.name if sp.store else "N/A" # Include store name for clarity
            })

    # Inventory Value
    inventory_value_query = db.session.query(func.sum(StoreProduct.quantity_in_stock * StoreProduct.price))\
        .filter(store_product_filter_condition, StoreProduct.is_deleted == False)
    inventory_value = inventory_value_query.scalar() or Decimal('0.00')

    # Total Purchase Value
    total_purchase_value_query = db.session.query(func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost))\
        .join(Purchase, Purchase.id == PurchaseItem.purchase_id)\
        .filter(
            purchase_filter_condition,
            PurchaseItem.is_deleted == False,
            Purchase.is_deleted == False
        )
    total_purchase_value = total_purchase_value_query.scalar() or Decimal('0.00')

    # Recent Purchases
    recent_purchases_data = []
    purchases = Purchase.query.filter(
        purchase_filter_condition,
        Purchase.is_deleted == False
    ).order_by(Purchase.date.desc()).limit(5).all()
    for p in purchases:
        recent_purchases_data.append({
            "id": p.id,
            "notes": p.notes,
            "purchase_date": p.date.isoformat() if p.date else None,
            "store_name": p.store.name if p.store else "N/A",
            "supplier_name": p.supplier.name if p.supplier else "N/A"
        })

    # Recent Transfers
    recent_transfers_data = []
    transfers = StockTransfer.query.filter(
        transfer_filter_condition,
        StockTransfer.is_deleted == False
    ).order_by(StockTransfer.transfer_date.desc()).limit(5).all()
    
    for t in transfers:
        from_store_name = Store.query.get(t.from_store_id).name if t.from_store_id else "N/A"
        to_store_name = Store.query.get(t.to_store_id).name if t.to_store_id else "N/A"
        recent_transfers_data.append({
            "id": t.id,
            "notes": t.notes,
            "date": t.transfer_date.isoformat() if t.transfer_date else None,
            "from_store": from_store_name,
            "to_store": to_store_name
        })
    
    # Supplier Spending Trends
    supplier_spending_trends_data = []
    top_suppliers_query = db.session.query(
        Supplier.id.label('supplier_id'),
        Supplier.name.label('supplier_name'),
        func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost).label('total_spent')
    ).join(Purchase, Purchase.id == PurchaseItem.purchase_id)\
     .join(Supplier, Supplier.id == Purchase.supplier_id)\
     .filter(
        purchase_filter_condition,
        PurchaseItem.is_deleted == False,
        Purchase.is_deleted == False,
        Supplier.is_deleted == False
    ).group_by(Supplier.id, Supplier.name)\
     .order_by(func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost).desc())\
     .limit(5).all()

    for s_id, s_name, total_spent in top_suppliers_query:
        supplier_spending_trends_data.append({
            "supplier_id": s_id,
            "supplier_name": s_name,
            "total_spent": float(total_spent)
        })

    summary_data = {
        "total_items": total_items,
        "total_stock": total_stock,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "low_stock_items": low_stock_items_data,
        "out_of_stock_items": out_of_stock_items_data,
        "in_stock_items": in_stock_items_data,
        "recent_purchases": recent_purchases_data,
        "recent_transfers": recent_transfers_data,
        "inventory_value": float(inventory_value),
        "total_purchase_value": float(total_purchase_value),
        "supplier_spending_trends": supplier_spending_trends_data
    }

    return jsonify(summary_data), 200

### /dashboard/movements Route
@merchant_dashboard_bp.route('/movements', methods=['GET'])
# @jwt_required()
# @role_required("merchant")
def get_merchant_dashboard_movements():
    """
    Fetches recent inventory movements (purchases and stock transfers) for the merchant dashboard.
    Can be filtered by a specific store using the 'store_id' query parameter.
    """
    selected_store_id_param = request.args.get('store_id')

    all_active_store_ids = [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    if not all_active_store_ids:
        return jsonify([]), 200 # No active stores means no movements

    query_store_ids = []
    if selected_store_id_param and selected_store_id_param.lower() != 'all':
        try:
            selected_store_id_int = int(selected_store_id_param)
            if selected_store_id_int not in all_active_store_ids:
                abort(404, description="Store not found or is inactive.")
            query_store_ids = [selected_store_id_int]
        except ValueError:
            abort(400, description="Invalid 'store_id' provided. Must be an integer or 'all'.")
    else:
        query_store_ids = all_active_store_ids

    purchase_filter_condition = Purchase.store_id.in_(query_store_ids)
    transfer_filter_condition = (
        (StockTransfer.from_store_id.in_(query_store_ids)) |
        (StockTransfer.to_store_id.in_(query_store_ids))
    )

    all_movements = []

    # Fetch recent purchase items (last 10)
    purchase_items = PurchaseItem.query.join(Purchase)\
        .filter(
            purchase_filter_condition,
            PurchaseItem.is_deleted == False,
            Purchase.is_deleted == False
        ).order_by(PurchaseItem.created_at.desc()).limit(10).all()
    for pi in purchase_items:
        product = Product.query.get(pi.product_id)
        purchase = Purchase.query.get(pi.purchase_id)
        if product and purchase:
            all_movements.append({
                "id": pi.id,
                "type": "Purchase",
                "quantity": pi.quantity,
                "product_name": product.name,
                "date": purchase.date.isoformat() if purchase.date else None,
                "store_name": purchase.store.name if purchase.store else "N/A", # Indicate which store this purchase was for
                "source_or_destination": purchase.supplier.name if purchase.supplier else "N/A",
                "notes": purchase.notes or "N/A"
            })

    # Fetch recent stock transfer items (last 10)
    stock_transfer_items = StockTransferItem.query.join(StockTransfer)\
        .filter(
            transfer_filter_condition,
            StockTransferItem.is_deleted == False,
            StockTransfer.is_deleted == False
        ).order_by(StockTransferItem.created_at.desc()).limit(10).all()
    for sti in stock_transfer_items:
        product = Product.query.get(sti.product_id)
        transfer = StockTransfer.query.get(sti.stock_transfer_id)
        if product and transfer:
            from_store_name = Store.query.get(transfer.from_store_id).name if transfer.from_store_id else "N/A"
            to_store_name = Store.query.get(transfer.to_store_id).name if transfer.to_store_id else "N/A"
            
            all_movements.append({
                "id": sti.id,
                "type": "Transfer",
                "quantity": sti.quantity,
                "product_name": product.name,
                "date": transfer.transfer_date.isoformat() if transfer.transfer_date else None,
                "source_or_destination": f"{from_store_name} -> {to_store_name}",
                "notes": transfer.notes or "N/A"
            })
    
    # Sort all movements by date, descending, and return top 10
    all_movements.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)

    return jsonify(all_movements[:10]), 200

### /dashboard/sales_trend_daily Route
@merchant_dashboard_bp.route('/sales_trend_daily', methods=['GET'])
# @jwt_required()
# @role_required("merchant")
def get_daily_sales_trend():
    """
    Fetches daily total sales trend for the merchant dashboard.
    Can be filtered by a specific store using the 'store_id' query parameter.
    """
    selected_store_id_param = request.args.get('store_id')

    all_active_store_ids = [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    if not all_active_store_ids:
        return jsonify([]), 200

    query_store_ids = []
    if selected_store_id_param and selected_store_id_param.lower() != 'all':
        try:
            selected_store_id_int = int(selected_store_id_param)
            if selected_store_id_int not in all_active_store_ids:
                abort(404, description="Store not found or is inactive.")
            query_store_ids = [selected_store_id_int]
        except ValueError:
            abort(400, description="Invalid 'store_id' provided. Must be an integer or 'all'.")
    else:
        query_store_ids = all_active_store_ids

    sales_filter_condition = Sale.store_id.in_(query_store_ids)

    daily_sales = db.session.query(
        cast(Sale.created_at, Date).label('sale_date'),
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_sales')
    ).join(SaleItem, Sale.id == SaleItem.sale_id).filter(
        sales_filter_condition,
        Sale.is_deleted == False,
        SaleItem.is_deleted == False
    ).group_by(
        cast(Sale.created_at, Date)
    ).order_by(
        cast(Sale.created_at, Date)
    ).all()

    sales_trend_data = []
    for row in daily_sales:
        sales_trend_data.append({
            "date": row.sale_date.isoformat(),
            "value": float(row.total_sales)
        })
    return jsonify(sales_trend_data), 200

### /dashboard/profit_trend_daily Route
@merchant_dashboard_bp.route('/profit_trend_daily', methods=['GET'])
# @jwt_required()
# @role_required("merchant")
def get_daily_profit_trend():
    """
    Fetches daily total profit trend for the merchant dashboard.
    Can be filtered by a specific store using the 'store_id' query parameter.
    """
    selected_store_id_param = request.args.get('store_id')

    all_active_store_ids = [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    if not all_active_store_ids:
        return jsonify([]), 200

    query_store_ids = []
    if selected_store_id_param and selected_store_id_param.lower() != 'all':
        try:
            selected_store_id_int = int(selected_store_id_param)
            if selected_store_id_int not in all_active_store_ids:
                abort(404, description="Store not found or is inactive.")
            query_store_ids = [selected_store_id_int]
        except ValueError:
            abort(400, description="Invalid 'store_id' provided. Must be an integer or 'all'.")
    else:
        query_store_ids = all_active_store_ids

    sales_filter_condition = Sale.store_id.in_(query_store_ids)
    
    # The product_avg_cost_subquery should look at all relevant purchases to establish
    # an average cost for a product, regardless of the current store filter,
    # or you could limit it to the queried stores if costs differ per store.
    # For a superuser merchant, perhaps a global average cost is more appropriate,
    # or a weighted average across all stores the product has been purchased in.
    # For now, let's keep it limited to purchases within the `query_store_ids` for consistency.
    product_avg_cost_subquery = db.session.query(
        PurchaseItem.product_id,
        func.avg(PurchaseItem.unit_cost).label('avg_cost')
    ).join(Purchase, Purchase.id == PurchaseItem.purchase_id).filter(
        PurchaseItem.is_deleted == False,
        Purchase.is_deleted == False,
        Purchase.store_id.in_(query_store_ids) # Filter purchases relevant to the current store scope
    ).group_by(
        PurchaseItem.product_id
    ).subquery()

    daily_profit_data = db.session.query(
        cast(Sale.created_at, Date).label('sale_date'),
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_revenue'),
        func.sum(SaleItem.quantity * product_avg_cost_subquery.c.avg_cost).label('total_cogs')
    ).join(SaleItem, Sale.id == SaleItem.sale_id).join(
        StoreProduct, SaleItem.store_product_id == StoreProduct.id
    ).outerjoin(
        product_avg_cost_subquery,
        StoreProduct.product_id == product_avg_cost_subquery.c.product_id
    ).filter(
        sales_filter_condition,
        Sale.is_deleted == False,
        SaleItem.is_deleted == False
    ).group_by(
        cast(Sale.created_at, Date)
    ).order_by(
        cast(Sale.created_at, Date)
    ).all()

    profit_trend_data = []
    for row in daily_profit_data:
        revenue = row.total_revenue or Decimal('0.00')
        cogs = row.total_cogs or Decimal('0.00')
        profit = revenue - cogs
        profit_trend_data.append({
            "date": row.sale_date.isoformat(),
            "value": float(profit)
        })
    return jsonify(profit_trend_data), 200

### /dashboard/top_performing_stores Route
@merchant_dashboard_bp.route('/top_performing_stores', methods=['GET'])
# @jwt_required()
# @role_required("merchant")
def get_top_performing_stores():
    """
    Fetches the top performing stores based on total sales revenue.
    Since the merchant is a superuser, this aggregates across ALL active stores.
    The 'store_id' parameter is not applicable here as this endpoint is about
    comparing multiple stores.
    """
    # This endpoint inherently provides a list of stores, so no store_id filter here.
    # We always want to compare all active stores.
    all_active_store_ids = [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    
    if not all_active_store_ids:
        return jsonify([]), 200

    top_stores_query = db.session.query(
        Store.id.label('store_id'),
        Store.name.label('store_name'),
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_revenue')
    ).join(Sale, Store.id == Sale.store_id).join(
        SaleItem, Sale.id == SaleItem.sale_id
    ).filter(
        Store.id.in_(all_active_store_ids), # Ensure we only consider active stores
        Sale.is_deleted == False,
        SaleItem.is_deleted == False
    ).group_by(
        Store.id, Store.name
    ).order_by(
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).desc()
    ).limit(5).all() # Get top 5

    top_stores_data = []
    for store_id, store_name, total_revenue in top_stores_query:
        top_stores_data.append({
            "store_id": store_id,
            "store_name": store_name,
            "total_revenue": float(total_revenue)
        })
    return jsonify(top_stores_data), 200