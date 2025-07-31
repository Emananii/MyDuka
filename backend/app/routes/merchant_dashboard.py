from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required # Assuming JWT is used
from app.routes.auth_routes import role_required # Assuming this path is correct
from app.models import db, Product, StoreProduct, Purchase, StockTransfer, PurchaseItem, StockTransferItem, Supplier, User, Store, Sale, SaleItem
from sqlalchemy import func, distinct, cast, String, Date, and_, or_ # Import and_ and or_ for flexible filtering
from datetime import datetime, timedelta
from decimal import Decimal

merchant_dashboard_bp = Blueprint('merchant_dashboard', __name__, url_prefix='/dashboard')

@merchant_dashboard_bp.route('/summary', methods=['GET'])
#@jwt_required()
#@role_required("merchant", "admin") # Merchants (as system-wide admins) and actual admins
def get_merchant_dashboard_summary():
    """
    Fetches summary statistics for the merchant dashboard, optionally filtered by store_id.
    If no store_id is provided, aggregates data across all stores.
    """
    store_id = request.args.get('store_id', type=int) # Get store_id from query params

    # --- Start by building base queries, then apply store_id filter if present ---

    # Base query for StoreProduct, always filtered by is_deleted=False
    store_product_base_query = StoreProduct.query.filter(StoreProduct.is_deleted == False)
    if store_id:
        store_product_base_query = store_product_base_query.filter(StoreProduct.store_id == store_id)

    # Total Items (count of all unique products in the filtered stores)
    # This now correctly reflects unique products relevant to the selected store(s)
    total_items_query = db.session.query(func.count(distinct(StoreProduct.product_id))).filter(StoreProduct.is_deleted == False)
    if store_id:
        total_items_query = total_items_query.filter(StoreProduct.store_id == store_id)
    total_items = total_items_query.scalar() or 0

    # Total Stock (sum of quantity_in_stock across all active StoreProduct entries in the filtered stores)
    total_stock_query = db.session.query(func.sum(StoreProduct.quantity_in_stock)).filter(StoreProduct.is_deleted == False)
    if store_id:
        total_stock_query = total_stock_query.filter(StoreProduct.store_id == store_id)
    total_stock = total_stock_query.scalar() or 0

    # Low Stock Count and Items
    low_stock_store_products = store_product_base_query.filter(
        StoreProduct.quantity_in_stock <= StoreProduct.low_stock_threshold,
        StoreProduct.quantity_in_stock > 0
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
                "threshold": sp.low_stock_threshold
            })

    # Out of Stock Count and Items
    out_of_stock_store_products = store_product_base_query.filter_by(quantity_in_stock=0).all()
    out_of_stock_count = len(out_of_stock_store_products)

    out_of_stock_items_data = []
    for sp in out_of_stock_store_products:
        product = Product.query.get(sp.product_id)
        if product:
            out_of_stock_items_data.append({
                "id": product.id,
                "name": product.name,
                "stock_level": sp.quantity_in_stock
            })

    # Inventory Value (sum of quantity_in_stock * price for all active store products in the filtered stores)
    inventory_value_query = db.session.query(func.sum(StoreProduct.quantity_in_stock * StoreProduct.price)).filter(StoreProduct.is_deleted == False)
    if store_id:
        inventory_value_query = inventory_value_query.filter(StoreProduct.store_id == store_id)
    inventory_value = inventory_value_query.scalar() or Decimal('0.00')

    # Total Purchase Value (sum of quantity * unit_cost for all active purchase items in the filtered stores)
    total_purchase_value_query = db.session.query(func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost)).join(Purchase).filter(
        PurchaseItem.is_deleted == False,
        Purchase.is_deleted == False
    )
    if store_id:
        total_purchase_value_query = total_purchase_value_query.filter(Purchase.store_id == store_id)
    total_purchase_value = total_purchase_value_query.scalar() or Decimal('0.00')

    # Recent Purchases (last 5, ordered by date descending, for filtered stores)
    recent_purchases_query = Purchase.query.filter_by(is_deleted=False)
    if store_id:
        recent_purchases_query = recent_purchases_query.filter(Purchase.store_id == store_id)
    recent_purchases = recent_purchases_query.order_by(Purchase.date.desc()).limit(5).all()

    recent_purchases_data = []
    for p in recent_purchases:
        recent_purchases_data.append({
            "id": p.id,
            "notes": p.notes,
            "purchase_date": p.date.isoformat() if p.date else None
        })

    # Recent Transfers (last 5, ordered by transfer_date descending, involving filtered stores)
    recent_transfers_query = StockTransfer.query.filter_by(is_deleted=False)
    if store_id:
        recent_transfers_query = recent_transfers_query.filter(
            or_(StockTransfer.from_store_id == store_id, StockTransfer.to_store_id == store_id)
        )
    recent_transfers = recent_transfers_query.order_by(StockTransfer.transfer_date.desc()).limit(5).all()

    recent_transfers_data = []
    for t in recent_transfers:
        recent_transfers_data.append({
            "id": t.id,
            "notes": t.notes,
            "date": t.transfer_date.isoformat() if t.transfer_date else None
        })

    # Supplier Spending Trends (Top 5 suppliers by total spent for filtered stores)
    supplier_spending_trends_data = []
    top_suppliers_query = db.session.query(
        Supplier.id.label('supplier_id'),
        Supplier.name.label('supplier_name'),
        func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost).label('total_spent')
    ).join(Purchase, Purchase.id == PurchaseItem.purchase_id)\
     .join(Supplier, Supplier.id == Purchase.supplier_id)\
     .filter(
        PurchaseItem.is_deleted == False,
        Purchase.is_deleted == False,
        Supplier.is_deleted == False
     )
    if store_id:
        top_suppliers_query = top_suppliers_query.filter(Purchase.store_id == store_id)

    top_suppliers_query = top_suppliers_query.group_by(Supplier.id, Supplier.name)\
                                              .order_by(func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost).desc())\
                                              .limit(5).all()

    for s_id, s_name, total_spent in top_suppliers_query:
        supplier_spending_trends_data.append({
            "supplier_id": s_id,
            "supplier_name": s_name,
            "total_spent": float(total_spent)
        })

    # In Stock Items (for the frontend's low stock table, typically a few examples)
    # These are items not low stock and not out of stock
    # This query also needs to be filtered by store_id
    in_stock_store_products = store_product_base_query.filter(
        StoreProduct.quantity_in_stock > StoreProduct.low_stock_threshold
    ).limit(5).all()

    in_stock_items_data = []
    for sp in in_stock_store_products:
        product = Product.query.get(sp.product_id)
        if product:
            in_stock_items_data.append({
                "id": product.id,
                "name": product.name,
                "stock_level": sp.quantity_in_stock
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

@merchant_dashboard_bp.route('/movements', methods=['GET'])
#@jwt_required()
#@role_required("merchant", "admin")
def get_merchant_dashboard_movements():
    """
    Fetches recent inventory movements (sales, purchases, and stock transfers),
    optionally filtered by store_id.
    """
    store_id = request.args.get('store_id', type=int)

    all_movements = []

    # Fetch recent sales (last 10)
    # Corrected: Removed reference to Sale.notes
    sales_query = db.session.query(
        Sale.id, # Keep ID for unique key
        Sale.created_at.label('date'),
        db.literal_column("'Sale'").label('type'),
        func.sum(SaleItem.quantity).label('quantity'),
        Product.name.label('product_name'), # Include product name
        Store.name.label('source_or_destination_store_name'), # Sale happens at this store
        db.literal_column("'N/A'").label('notes') # Provide a default 'N/A' for Sale notes
    ).join(SaleItem, Sale.id == SaleItem.sale_id)\
     .join(Store, Sale.store_id == Store.id)\
     .join(StoreProduct, SaleItem.store_product_id == StoreProduct.id)\
     .join(Product, StoreProduct.product_id == Product.id)\
     .filter(Sale.is_deleted == False, SaleItem.is_deleted == False)
    if store_id:
        sales_query = sales_query.filter(Sale.store_id == store_id)
    # Group by Sale.id for the sum, and include other selected columns for distinctness
    sales = sales_query.group_by(Sale.id, Sale.created_at, Product.name, Store.name)\
                       .order_by(Sale.created_at.desc()).limit(10).all()

    for s in sales:
        all_movements.append({
            "id": s.id,
            "type": s.type,
            "quantity": s.quantity,
            "product_name": s.product_name,
            "date": s.date.isoformat() if s.date else None,
            "source_or_destination": s.source_or_destination_store_name, # Use the actual store name
            "notes": s.notes # Will be 'N/A' from the query
        })

    # Fetch recent purchase items (last 10)
    purchase_items_query = db.session.query(
        PurchaseItem.id, # Keep ID for unique key
        Purchase.date.label('date'),
        db.literal_column("'Purchase'").label('type'),
        PurchaseItem.quantity,
        Product.name.label('product_name'),
        Supplier.name.label('source_or_destination'),
        Purchase.notes.label('notes')
    ).join(Purchase, Purchase.id == PurchaseItem.purchase_id)\
     .join(Product, PurchaseItem.product_id == Product.id)\
     .join(Supplier, Purchase.supplier_id == Supplier.id)\
     .filter(PurchaseItem.is_deleted == False, Purchase.is_deleted == False)
    if store_id:
        purchase_items_query = purchase_items_query.filter(Purchase.store_id == store_id)
    purchase_items = purchase_items_query.order_by(Purchase.date.desc()).limit(10).all()

    for pi in purchase_items:
        all_movements.append({
            "id": pi.id,
            "type": pi.type,
            "quantity": pi.quantity,
            "product_name": pi.product_name,
            "date": pi.date.isoformat() if pi.date else None,
            "source_or_destination": pi.source_or_destination,
            "notes": pi.notes or "N/A"
        })

    # Fetch recent stock transfer items (last 10)
    stock_transfer_items_query = db.session.query(
        StockTransferItem.id, # Keep ID for unique key
        StockTransfer.transfer_date.label('date'),
        db.literal_column("'Transfer'").label('type'),
        StockTransferItem.quantity,
        Product.name.label('product_name'),
        StockTransfer.from_store_id, # Get from_store_id directly
        StockTransfer.to_store_id,   # Get to_store_id directly
        StockTransfer.notes.label('notes')
    ).join(StockTransfer, StockTransfer.id == StockTransferItem.stock_transfer_id)\
     .join(Product, StockTransferItem.product_id == Product.id)\
     .filter(StockTransferItem.is_deleted == False, StockTransfer.is_deleted == False)

    if store_id:
        stock_transfer_items_query = stock_transfer_items_query.filter(
            or_(StockTransfer.from_store_id == store_id, StockTransfer.to_store_id == store_id)
        )
    stock_transfer_items = stock_transfer_items_query.order_by(StockTransfer.transfer_date.desc()).limit(10).all()

    for sti in stock_transfer_items:
        from_store_name = Store.query.get(sti.from_store_id).name if sti.from_store_id else "N/A"
        to_store_name = Store.query.get(sti.to_store_id).name if sti.to_store_id else "N/A"

        source_or_destination_val = ""
        if store_id:
            # If a specific store is selected, show context relative to that store
            if sti.from_store_id == store_id:
                source_or_destination_val = f"To: {to_store_name}"
            elif sti.to_store_id == store_id:
                source_or_destination_val = f"From: {from_store_name}"
            else:
                # This case should ideally not be reached if the filter is working perfectly,
                # but as a fallback, show full transfer path.
                source_or_destination_val = f"{from_store_name} -> {to_store_name}"
        else:
            # If "All Stores" is selected, show the full transfer path
            source_or_destination_val = f"{from_store_name} -> {to_store_name}"


        all_movements.append({
            "id": sti.id,
            "type": sti.type,
            "quantity": sti.quantity,
            "product_name": sti.product_name,
            "date": sti.date.isoformat() if sti.date else None,
            "source_or_destination": source_or_destination_val,
            "notes": sti.notes or "N/A"
        })

    # Sort all movements by date, descending, and return top 10
    all_movements.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)

    return jsonify(all_movements[:10]), 200


# --- Sales Trend Daily ---
@merchant_dashboard_bp.route('/sales_trend_daily', methods=['GET'])
#@jwt_required()
#@role_required("merchant", "admin")
def get_daily_sales_trend():
    """
    Fetches daily total sales trend for the merchant dashboard, optionally filtered by store_id.
    """
    store_id = request.args.get('store_id', type=int)

    daily_sales_query = db.session.query(
        cast(Sale.created_at, Date).label('sale_date'),
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_sales')
    ).join(SaleItem, Sale.id == SaleItem.sale_id).filter(
        Sale.is_deleted == False,
        SaleItem.is_deleted == False
    )
    if store_id:
        daily_sales_query = daily_sales_query.filter(Sale.store_id == store_id)

    daily_sales = daily_sales_query.group_by(
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

# --- Profit Trend Daily ---
@merchant_dashboard_bp.route('/profit_trend_daily', methods=['GET'])
#@jwt_required()
#@role_required("merchant", "admin")
def get_daily_profit_trend():
    """
    Fetches daily total profit trend for the merchant dashboard, optionally filtered by store_id.
    Profit is approximated as (Sales Revenue - Average Product Cost).
    """
    store_id = request.args.get('store_id', type=int)

    # Subquery to calculate the average unit cost for each product from purchases
    product_avg_cost_subquery = db.session.query(
        PurchaseItem.product_id,
        func.avg(PurchaseItem.unit_cost).label('avg_cost')
    ).filter(
        PurchaseItem.is_deleted == False
    ).group_by(
        PurchaseItem.product_id
    ).subquery()

    # Query to get daily sales revenue and approximate daily cost of goods sold (COGS)
    daily_profit_data_query = db.session.query(
        cast(Sale.created_at, Date).label('sale_date'),
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_revenue'),
        func.sum(SaleItem.quantity * product_avg_cost_subquery.c.avg_cost).label('total_cogs')
    ).join(SaleItem, Sale.id == SaleItem.sale_id)\
     .join(StoreProduct, SaleItem.store_product_id == StoreProduct.id)\
     .outerjoin(
        product_avg_cost_subquery,
        StoreProduct.product_id == product_avg_cost_subquery.c.product_id
    ).filter(
        Sale.is_deleted == False,
        SaleItem.is_deleted == False
    )
    if store_id:
        daily_profit_data_query = daily_profit_data_query.filter(Sale.store_id == store_id)

    daily_profit_data = daily_profit_data_query.group_by(
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

# --- Top Performing Stores ---
@merchant_dashboard_bp.route('/top_performing_stores', methods=['GET'])
#@jwt_required()
#@role_required("merchant", "admin")
def get_top_performing_stores():
    """
    Fetches the top performing stores based on total sales revenue.
    If no store_id is provided, it lists overall top stores.
    If a store_id is provided, it will effectively filter to just that store
    (though the "top N" concept is less relevant for a single store,
    the data will still be returned for consistency).
    """
    store_id = request.args.get('store_id', type=int)

    top_stores_query = db.session.query(
        Store.id.label('store_id'),
        Store.name.label('store_name'),
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).label('total_revenue')
    ).join(Sale, Store.id == Sale.store_id).join(
        SaleItem, Sale.id == SaleItem.sale_id
    ).filter(
        Sale.is_deleted == False,
        SaleItem.is_deleted == False
    )
    if store_id:
        top_stores_query = top_stores_query.filter(Store.id == store_id)

    top_stores_query = top_stores_query.group_by(
        Store.id, Store.name
    ).order_by(
        func.sum(SaleItem.quantity * SaleItem.price_at_sale).desc()
    ).limit(5).all() # Get top 5 stores

    top_stores_data = []
    for store_id_val, store_name, total_revenue in top_stores_query:
        top_stores_data.append({
            "store_id": store_id_val,
            "store_name": store_name,
            "total_revenue": float(total_revenue)
        })
    return jsonify(top_stores_data), 200