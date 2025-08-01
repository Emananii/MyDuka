# app/routes/admin_dashboard.py
from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.routes.auth_routes import role_required
from app.models import db, Product, StoreProduct, Purchase, StockTransfer, PurchaseItem, Supplier, User, Store, Sale, SaleItem, StockTransferItem
from sqlalchemy import func, distinct, cast, String, Date
from datetime import datetime, timedelta
from decimal import Decimal

# Define the blueprint with the URL prefix for admin dashboard routes
admin_dashboard_bp = Blueprint('admin_dashboard', __name__, url_prefix='/admin_dashboard')

# Helper function to get the store ID and store name for the logged-in admin
def get_admin_store_info(user_id):
    """
    Retrieves the store ID and name for a given admin user.
    Aborts with a 403 error if the user is not a valid admin with an assigned store.
    """
    user = User.query.get(user_id)
    if not user or user.role != 'admin' or not user.store_id:
        abort(403, description="Access forbidden: Admin not associated with a valid store.")
    store = Store.query.get(user.store_id)
    if not store:
        abort(403, description="Access forbidden: Admin's store not found.")
    return user.store_id, store.name

@admin_dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_admin_dashboard_summary():
    """
    Fetches summary statistics and store name for the admin dashboard,
    scoped to the logged-in admin's assigned store.
    """
    admin_id = get_jwt_identity()
    admin_store_id, admin_store_name = get_admin_store_info(admin_id)

    # All queries will now implicitly filter by admin_store_id
    store_product_filter_condition = StoreProduct.store_id == admin_store_id
    purchase_filter_condition = Purchase.store_id == admin_store_id
    sale_filter_condition = Sale.store_id == admin_store_id
    
    transfer_filter_condition = (
        (StockTransfer.from_store_id == admin_store_id) |
        (StockTransfer.to_store_id == admin_store_id)
    )

    # --- Data Aggregation ---

    total_items = db.session.query(func.count(distinct(StoreProduct.product_id)))\
        .filter(store_product_filter_condition, StoreProduct.is_deleted == False)\
        .scalar() or 0

    total_stock_query = db.session.query(func.sum(StoreProduct.quantity_in_stock))\
        .filter(store_product_filter_condition, StoreProduct.is_deleted == False)
    total_stock = total_stock_query.scalar() or 0

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
                "threshold": sp.low_stock_threshold
            })

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
                "stock_level": sp.quantity_in_stock
            })

    in_stock_store_products = StoreProduct.query.filter(
        store_product_filter_condition,
        StoreProduct.quantity_in_stock > StoreProduct.low_stock_threshold,
        StoreProduct.is_deleted == False
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

    inventory_value_query = db.session.query(func.sum(StoreProduct.quantity_in_stock * StoreProduct.price))\
        .filter(store_product_filter_condition, StoreProduct.is_deleted == False)
    inventory_value = inventory_value_query.scalar() or Decimal('0.00')

    total_purchase_value_query = db.session.query(func.sum(PurchaseItem.quantity * PurchaseItem.unit_cost))\
        .join(Purchase, Purchase.id == PurchaseItem.purchase_id)\
        .filter(
            purchase_filter_condition,
            PurchaseItem.is_deleted == False,
            Purchase.is_deleted == False
        )
    total_purchase_value = total_purchase_value_query.scalar() or Decimal('0.00')

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
            "supplier_name": p.supplier.name if p.supplier else "N/A"
        })

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
        "store_name": admin_store_name, # Added store_name to the response
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

# ---

### `/admin_dashboard/movements` Route

@admin_dashboard_bp.route('/movements', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_admin_dashboard_movements():
    """
    Fetches recent inventory movements (purchases and stock transfers) for the admin dashboard,
    scoped to the logged-in admin's assigned store.
    """
    admin_id = get_jwt_identity()

    admin_store_id, _ = get_admin_store_info(admin_id)

    purchase_filter_condition = Purchase.store_id == admin_store_id
    transfer_filter_condition = (
        (StockTransfer.from_store_id == admin_store_id) |
        (StockTransfer.to_store_id == admin_store_id)
    )

    all_movements = []

    # Get recent purchases and format them
    purchase_items = db.session.query(PurchaseItem).join(Purchase)\
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
                "source_or_destination": purchase.supplier.name if purchase.supplier else "N/A",
                "notes": purchase.notes or "N/A"
            })

    # Get recent transfers and format them
    stock_transfer_items = db.session.query(StockTransferItem).join(StockTransfer)\
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
    
    # Sort all movements by date, most recent first
    all_movements.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)

    # Return the top 10 most recent movements
    return jsonify(all_movements[:10]), 200

# ---

### `/admin_dashboard/sales_trend_daily` Route

@admin_dashboard_bp.route('/sales_trend_daily', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_daily_sales_trend_admin():
    """
    Fetches daily total sales trend for the admin dashboard,
    scoped to the logged-in admin's assigned store.
    """
    admin_id = get_jwt_identity()

    admin_store_id, _ = get_admin_store_info(admin_id)

    sales_filter_condition = Sale.store_id == admin_store_id

    # Query to sum sales value per day
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

    # Format the data for the front-end chart
    sales_trend_data = []
    for row in daily_sales:
        sales_trend_data.append({
            "date": row.sale_date.isoformat(),
            "value": float(row.total_sales) if row.total_sales else 0.0
        })

    return jsonify(sales_trend_data), 200

# ---

### `/admin_dashboard/profit_trend_daily` Route

@admin_dashboard_bp.route('/profit_trend_daily', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_daily_profit_trend_admin():
    """
    Calculates and fetches daily profit trends for the admin dashboard,
    scoped to the logged-in admin's assigned store.
    Profit is calculated as (sale price - unit cost) per item.
    """
    admin_id = get_jwt_identity()

    admin_store_id, _ = get_admin_store_info(admin_id)

    # We need to join Sale, SaleItem, and StoreProduct to get the unit cost for profit calculation
    daily_profit_query = db.session.query(
        cast(Sale.created_at, Date).label('profit_date'),
        func.sum(
            SaleItem.quantity * (SaleItem.price_at_sale - StoreProduct.unit_cost)
        ).label('total_profit')
    ).join(SaleItem, Sale.id == SaleItem.sale_id).join(
        StoreProduct, (StoreProduct.id == SaleItem.store_product_id) & (StoreProduct.store_id == Sale.store_id)
    ).filter(
        Sale.store_id == admin_store_id,
        Sale.is_deleted == False,
        SaleItem.is_deleted == False,
        StoreProduct.is_deleted == False
    ).group_by(
        cast(Sale.created_at, Date)
    ).order_by(
        cast(Sale.created_at, Date)
    ).all()

    # Format the data for the front-end chart
    profit_trend_data = []
    for row in daily_profit_query:
        profit_trend_data.append({
            "date": row.profit_date.isoformat(),
            "value": float(row.total_profit) if row.total_profit else 0.0
        })

    return jsonify(profit_trend_data), 200
