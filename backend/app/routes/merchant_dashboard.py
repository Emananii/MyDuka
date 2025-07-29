from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Store  # Assuming these models exist
from services.sales_services import SalesService
from services.reporting_services import get_monthly_summary
from app.routes.auth_routes import role_required
from app import db

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Store, Sales, Payment, Product, StockMovement, Activity
from app import db
from datetime import datetime
from sqlalchemy import func

merchant_dashboard_bp = Blueprint('merchant_dashboard', __name__, url_prefix='/api/merchant-dashboard')

@merchant_dashboard_bp.route('/overview', methods=['GET'])
@jwt_required()
def overview():
    """
    Returns an overview of the merchant's business: total stores, revenue, and pending payments.
    ---
    responses:
      200:
        description: Overview of the merchant's business
        content:
          application/json:
            schema:
              type: object
              properties:
                total_stores: { type: integer }
                total_revenue: { type: number }
                pending_payments: { type: number }
    """
    current_user_id = get_jwt_identity()

    total_stores = Store.query.filter_by(merchant_id=current_user_id).count()
    
    total_revenue = db.session.query(func.sum(Sales.total_amount))\
        .filter(Sales.store_id.in_(
            db.session.query(Store.id).filter_by(merchant_id=current_user_id)
        )).scalar() or 0.0
    
    pending_payments = db.session.query(func.sum(Payment.amount))\
        .filter(Payment.store_id.in_(
            db.session.query(Store.id).filter_by(merchant_id=current_user_id)
        )).filter_by(status='pending').scalar() or 0.0

    return jsonify({
        'total_stores': total_stores,
        'total_revenue': total_revenue,
        'pending_payments': pending_payments
    })

@merchant_dashboard_bp.route('/sales', methods=['GET'])
@jwt_required()
def sales():
    """
    Returns sales data for each store of the merchant.
    ---
    responses:
      200:
        description: Sales data per store
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  name: { type: string }
                  sales: { type: number }
    """
    current_user_id = get_jwt_identity()

    sales_data = db.session.query(Store.name, func.sum(Sales.total_amount).label('sales'))\
        .join(Sales, Store.id == Sales.store_id)\
        .filter(Store.merchant_id == current_user_id)\
        .group_by(Store.id, Store.name)\
        .all()

    return jsonify([
        {'name': name, 'sales': float(sales) if sales else 0.0}
        for name, sales in sales_data
    ])

@merchant_dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    """
    Returns inventory summary data for the merchant's stores.
    ---
    responses:
      200:
        description: Inventory summary data
        content:
          application/json:
            schema:
              type: object
              properties:
                total_items: { type: integer }
                total_stock: { type: integer }
                low_stock_count: { type: integer }
                out_of_stock_count: { type: integer }
                low_stock_items: { type: array, items: { type: object, properties: { id: { type: integer }, name: { type: string }, stock_level: { type: integer } } } }
                in_stock_items: { type: array, items: { type: object, properties: { id: { type: integer }, name: { type: string }, stock_level: { type: integer } } } }
                out_of_stock_items: { type: array, items: { type: object, properties: { id: { type: integer }, name: { type: string } } } }
                inventory_value: { type: number }
                total_purchase_value: { type: number }
                supplier_spending_trends: { type: array, items: { type: object, properties: { supplier_id: { type: integer }, supplier_name: { type: string }, total_spent: { type: number } } } }
    """
    current_user_id = get_jwt_identity()

    # Get stores for the current merchant
    merchant_stores = Store.query.filter_by(merchant_id=current_user_id).all()
    store_ids = [store.id for store in merchant_stores]

    # Total items and stock
    total_items = Product.query.filter(Product.store_id.in_(store_ids)).count()
    total_stock = db.session.query(func.sum(Product.stock_level))\
        .filter(Product.store_id.in_(store_ids)).scalar() or 0

    # Low stock and out-of-stock counts
    low_stock_count = Product.query.filter(Product.store_id.in_(store_ids), Product.stock_level <= 5, Product.stock_level > 0).count()
    out_of_stock_count = Product.query.filter(Product.store_id.in_(store_ids), Product.stock_level == 0).count()

    # Low stock and in-stock items
    low_stock_items = Product.query.filter(Product.store_id.in_(store_ids), Product.stock_level <= 5, Product.stock_level > 0).all()
    in_stock_items = Product.query.filter(Product.store_id.in_(store_ids), Product.stock_level > 5).all()
    out_of_stock_items = Product.query.filter(Product.store_id.in_(store_ids), Product.stock_level == 0).all()

    # Inventory value (sum of stock_level * unit_price)
    inventory_value = db.session.query(func.sum(Product.stock_level * Product.unit_price))\
        .filter(Product.store_id.in_(store_ids)).scalar() or 0.0

    # Total purchase value (sum of purchase amounts)
    total_purchase_value = db.session.query(func.sum(Payment.amount))\
        .filter(Payment.store_id.in_(store_ids), Payment.status == 'completed').scalar() or 0.0

    # Supplier spending trends (assuming a Supplier model with purchases linked)
    supplier_spending = db.session.query(
        Supplier.id.label('supplier_id'),
        Supplier.name.label('supplier_name'),
        func.sum(Payment.amount).label('total_spent')
    ).join(Payment, Payment.supplier_id == Supplier.id)\
     .filter(Payment.store_id.in_(store_ids), Payment.status == 'completed')\
     .group_by(Supplier.id, Supplier.name).all()

    return jsonify({
        'total_items': total_items,
        'total_stock': total_stock,
        'low_stock_count': low_stock_count,
        'out_of_stock_count': out_of_stock_count,
        'low_stock_items': [{'id': item.id, 'name': item.name, 'stock_level': item.stock_level} for item in low_stock_items],
        'in_stock_items': [{'id': item.id, 'name': item.name, 'stock_level': item.stock_level} for item in in_stock_items],
        'out_of_stock_items': [{'id': item.id, 'name': item.name} for item in out_of_stock_items],
        'inventory_value': float(inventory_value),
        'total_purchase_value': float(total_purchase_value),
        'supplier_spending_trends': [
            {'supplier_id': sid, 'supplier_name': name, 'total_spent': float(total)}
            for sid, name, total in supplier_spending
        ]
    })

@merchant_dashboard_bp.route('/movements', methods=['GET'])
@jwt_required()
def movements():
    """
    Returns recent stock movements for the merchant's stores.
    ---
    responses:
      200:
        description: Recent stock movements
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  id: { type: integer }
                  type: { type: string }
                  date: { type: string, format: date-time }
                  quantity: { type: integer }
                  source_or_destination: { type: string }
                  notes: { type: string }
    """
    current_user_id = get_jwt_identity()
    store_ids = [store.id for store in Store.query.filter_by(merchant_id=current_user_id).all()]

    movements = StockMovement.query.filter(StockMovement.store_id.in_(store_ids))\
        .order_by(StockMovement.date.desc()).limit(10).all()

    return jsonify([
        {
            'id': m.id,
            'type': m.type,
            'date': m.date.isoformat(),
            'quantity': m.quantity,
            'source_or_destination': m.source_or_destination,
            'notes': m.notes
        }
        for m in movements
    ])

@merchant_dashboard_bp.route('/activities', methods=['GET'])
@jwt_required()
def activities():
    """
    Returns recent activities for the merchant's stores.
    ---
    responses:
      200:
        description: Recent activities
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  id: { type: integer }
                  type: { type: string }
                  description: { type: string }
                  timestamp: { type: string, format: date-time }
    """
    current_user_id = get_jwt_identity()
    store_ids = [store.id for store in Store.query.filter_by(merchant_id=current_user_id).all()]

    activities = Activity.query.filter(Activity.store_id.in_(store_ids))\
        .order_by(Activity.timestamp.desc()).limit(10).all()

    return jsonify([
        {
            'id': a.id,
            'type': a.type,
            'description': a.description,
            'timestamp': a.timestamp.isoformat()
        }
        for a in activities
    ])