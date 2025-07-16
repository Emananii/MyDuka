from flask import Blueprint, jsonify, request
from .models import db, Category, Product, Purchase, PurchaseItem

routes = Blueprint('routes', __name__)

# Category 
@routes.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([category.to_dict() for category in categories]), 200

@routes.route('/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    new_category = Category(
        name=data['name'],
        description=data.get('description')
    )
    db.session.add(new_category)
    db.session.commit()
    return jsonify(new_category.to_dict()), 201

# Product 
@routes.route('/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([product.to_dict() for product in products]), 200

@routes.route('/products', methods=['POST'])
def create_product():
    data = request.get_json()
    product = Product(
        name=data['name'],
        description=data.get('description'),
        category_id=data['category_id'],
        unit=data['unit'],
        sku=data.get('sku')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

# Purchase 
@routes.route('/purchases', methods=['POST'])
def create_purchase():
    data = request.get_json()

    purchase = Purchase(
        supplier_id=data['supplier_id'],
        store_id=data['store_id'],
        date=data.get('date'),
        reference_number=data.get('reference_number'),
        is_paid=data.get('is_paid', False),
        notes=data.get('notes')
    )
    db.session.add(purchase)
    db.session.flush()  # to get purchase.id before commit

    for item in data.get('items', []):
        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=item['product_id'],
            quantity=item['quantity'],
            unit_cost=item['unit_cost']  # Fixed field name to match model
        )
        db.session.add(purchase_item)

    db.session.commit()
    return jsonify(purchase.to_dict()), 201

@routes.route('/purchases', methods=['GET'])
def get_purchases():
    purchases = Purchase.query.all()
    return jsonify([p.to_dict() for p in purchases]), 200

# Update Category
@routes.route('/categories/<int:id>', methods=['PATCH'])
def update_category(id):
    category = Category.query.get_or_404(id)
    data = request.get_json()

    category.name = data.get('name', category.name)
    category.description = data.get('description', category.description)

    db.session.commit()
    return jsonify(category.to_dict()), 200

# Delete Category 
@routes.route('/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    category = Category.query.get_or_404(id)
    category.is_deleted = True
    db.session.commit()
    return jsonify({'message': 'Category deleted'}), 200

# Update Product
@routes.route('/products/<int:id>', methods=['PATCH'])
def update_product(id):
    product = Product.query.get_or_404(id)
    data = request.get_json()

    product.name = data.get('name', product.name)
    product.description = data.get('description', product.description)
    product.category_id = data.get('category_id', product.category_id)
    product.unit = data.get('unit', product.unit)
    product.sku = data.get('sku', product.sku)

    db.session.commit()
    return jsonify(product.to_dict()), 200

# Delete Product 
@routes.route('/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    product = Product.query.get_or_404(id)
    product.is_deleted = True
    db.session.commit()
    return jsonify({'message': 'Product deleted'}), 200

# Filter Purchases
@routes.route('/purchases/filter', methods=['GET'])
def filter_purchases():
    supplier_id = request.args.get('supplier_id')
    store_id = request.args.get('store_id')
    date = request.args.get('date')

    query = Purchase.query

    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)
    if store_id:
        query = query.filter_by(store_id=store_id)
    if date:
        query = query.filter_by(date=date)

    purchases = query.all()
    return jsonify([p.to_dict() for p in purchases]), 200

# View Stock Levels by Store
@routes.route('/stock/<int:store_id>', methods=['GET'])
def get_stock_by_store(store_id):
    from .models import StoreProduct, Product

    store_products = StoreProduct.query.filter_by(store_id=store_id).all()

    results = []
    for sp in store_products:
        product = Product.query.get(sp.product_id)
        results.append({
            'product_id': product.id,
            'product_name': product.name,
            'sku': product.sku,
            'quantity_in_stock': sp.quantity_in_stock,
            'low_stock_threshold': sp.low_stock_threshold,
            'last_updated': sp.last_updated
        })

    return jsonify(results), 200
