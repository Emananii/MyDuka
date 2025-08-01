# app/routes/clerk_dashboard.py
from flask import Blueprint, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.routes.auth_routes import role_required
from app.models import db, Product, StoreProduct, User, Store
from sqlalchemy import func

# Define the blueprint with the URL prefix for clerk dashboard routes
clerk_dashboard_bp = Blueprint('clerk_dashboard', __name__, url_prefix='/clerk_dashboard')

def get_clerk_store_info(user_id):
    """
    Retrieves the store ID and name for a given clerk user.
    Aborts with a 403 error if the user is not a valid clerk with an assigned store.
    """
    user = User.query.get(user_id)
    if not user or user.role != 'clerk' or not user.store_id:
        # Prevent access if the user is not a clerk or not associated with a store.
        abort(403, description="Access forbidden: Clerk not associated with a valid store.")
    store = Store.query.get(user.store_id)
    if not store:
        # Prevent access if the clerk's assigned store does not exist.
        abort(403, description="Access forbidden: Clerk's store not found.")
    return user.store_id, store.name

@clerk_dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
@role_required("clerk")
def get_clerk_dashboard_summary():
    """
    Fetches low stock and out of stock items for the clerk dashboard,
    scoped to the logged-in clerk's assigned store.
    """
    clerk_id = get_jwt_identity()
    clerk_store_id, clerk_store_name = get_clerk_store_info(clerk_id)

    # Filter conditions for the clerk's specific store
    store_product_filter_condition = StoreProduct.store_id == clerk_store_id
    
    # Query for low stock items, similar to the admin dashboard but only for the clerk's store
    low_stock_store_products = StoreProduct.query.filter(
        store_product_filter_condition,
        StoreProduct.quantity_in_stock <= StoreProduct.low_stock_threshold,
        StoreProduct.quantity_in_stock > 0,
        StoreProduct.is_deleted == False
    ).all()
    
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

    # Query for out of stock items
    out_of_stock_store_products = StoreProduct.query.filter(
        store_product_filter_condition,
        StoreProduct.quantity_in_stock == 0,
        StoreProduct.is_deleted == False
    ).all()
    
    out_of_stock_items_data = []
    for sp in out_of_stock_store_products:
        product = Product.query.get(sp.product_id)
        if product:
            out_of_stock_items_data.append({
                "id": product.id,
                "name": product.name,
                "stock_level": sp.quantity_in_stock
            })

    # The final response payload for the clerk dashboard
    summary_data = {
        "store_name": clerk_store_name,
        "low_stock_items": low_stock_items_data,
        "out_of_stock_items": out_of_stock_items_data,
    }

    return jsonify(summary_data), 200

