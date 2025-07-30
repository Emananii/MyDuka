# backend/app/routes/product_routes.py
from flask import Blueprint, jsonify, request
from app.models import Product, Category, StoreProduct # Ensure these are imported from your models.py
from app import db # Your SQLAlchemy database instance
from flask_jwt_extended import jwt_required # Assuming Flask-JWT-Extended for auth

product_bp = Blueprint('product_bp', __name__)

@product_bp.route('/api/products', methods=['GET'])
@jwt_required() # Protect this endpoint with JWT authentication
def get_all_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_query = request.args.get('search', type=str)
    category_id = request.args.get('category_id', type=int)

    products_query = Product.query

    if search_query:
        products_query = products_query.filter(
            (Product.name.ilike(f'%{search_query}%')) |
            (Product.sku.ilike(f'%{search_query}%'))
        )
    if category_id:
        products_query = products_query.filter_by(category_id=category_id)

    paginated_products = products_query.paginate(page=page, per_page=per_page, error_out=False)

    products_data = []
    for product in paginated_products.items:
        # You can also fetch specific store stock if a store_id query param is added later
        # For now, just product details
        products_data.append({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'unit': product.unit,
            'description': product.description,
            'category_name': product.category.name if product.category else None,
            'image_url': product.image_url,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None,
        })

    return jsonify({
        'products': products_data,
        'total_pages': paginated_products.pages,
        'current_page': paginated_products.page,
        'total_items': paginated_products.total
    }), 200

# You can add more routes here, e.g., get_product_by_id, create_product, update_product, delete_product