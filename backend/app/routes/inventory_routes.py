from flask import Blueprint, jsonify, request
from app.models import db,Category,Product, Purchase, PurchaseItem, StoreProduct, Supplier, Store
from flask_jwt_extended import jwt_required # Assuming JWT protection will be added later


inventory_bp = Blueprint('inventory', __name__, url_prefix="/api/inventory") # Added url_prefix for consistency

# --- CATEGORY ROUTES ---

@inventory_bp.route('/categories', methods=['GET'])
def get_categories():
   
    categories = Category.query.filter_by(is_deleted=False).all() # Assuming you filter out deleted categories
    return jsonify([category.to_dict() for category in categories]), 200

@inventory_bp.route('/categories', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_category():
    
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({"message": "Name is required."}), 400

    new_category = Category(
        name=name,
        description=data.get('description')
    )
    db.session.add(new_category)
    db.session.commit()
    return jsonify(new_category.to_dict()), 201

@inventory_bp.route('/categories/<int:id>', methods=['PATCH'])
# @jwt_required() # Uncomment if you want to protect this route
def update_category(id):
   
    category = Category.query.get_or_404(id)
    data = request.get_json()
    category.name = data.get('name', category.name)
    category.description = data.get('description', category.description)
    db.session.commit()
    return jsonify(category.to_dict()), 200

@inventory_bp.route('/categories/<int:id>', methods=['DELETE'])
# @jwt_required() # Uncomment if you want to protect this route
def delete_category(id):
    
    category = Category.query.get_or_404(id)
    category.is_deleted = True # Assuming is_deleted is a field in your Category model
    db.session.commit()
    return jsonify({'message': 'Category deleted'}), 200

# -------------------- PRODUCT ROUTES --------------------

@inventory_bp.route('/products', methods=['GET'])
def get_products():
   
    products = Product.query.filter_by(is_deleted=False).all() # Assuming you filter out deleted products
    return jsonify([product.to_dict() for product in products]), 200

@inventory_bp.route('/products', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_product():
    
    data = request.get_json()
    name = data.get('name')
    category_id = data.get('category_id')
    unit = data.get('unit')

    if not name or not category_id or not unit:
        return jsonify({"message": "Name, category_id, and unit are required."}), 400

    product = Product(
        name=name,
        description=data.get('description'),
        category_id=category_id,
        unit=unit,
        sku=data.get('sku')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

@inventory_bp.route('/products/<int:id>', methods=['PATCH'])
# @jwt_required() # Uncomment if you want to protect this route
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

@inventory_bp.route('/products/<int:id>', methods=['DELETE'])
# @jwt_required() # Uncomment if you want to protect this route
def delete_product(id):
    
    product = Product.query.get_or_404(id)
    product.is_deleted = True # Assuming is_deleted is a field in your Product model
    db.session.commit()
    return jsonify({'message': 'Product deleted'}), 200

# -------------------- SUPPLIER ROUTES --------------------

# --- START ADDITION: SUPPLIER ROUTES ---

@inventory_bp.route('/suppliers', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_supplier():
   
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request body cannot be empty"}), 400

    required_fields = ['name', 'contact_person', 'email', 'phone', 'address']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"message": f"Missing or empty required field: {field}"}), 400

    new_supplier = Supplier(
        name=data['name'],
        contact_person=data['contact_person'],
        email=data['email'],
        phone=data['phone'],
        address=data['address'],
        notes=data.get('notes')
    )

    try:
        db.session.add(new_supplier)
        db.session.commit()
        return jsonify(new_supplier.to_dict()), 201
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error creating supplier: {e.orig}")
        return jsonify({"message": "Supplier with this name or email might already exist."}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error creating supplier: {e}")
        return jsonify({"message": "An error occurred while saving the supplier."}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error creating supplier: {e}")
        return jsonify({"message": "An unexpected error occurred."}), 500

@inventory_bp.route('/suppliers', methods=['GET'])
def get_suppliers():
   
    suppliers = Supplier.query.all()
    return jsonify([supplier.to_dict() for supplier in suppliers]), 200

@inventory_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
def get_supplier(supplier_id):
   
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return jsonify({"message": "Supplier not found"}), 404
    return jsonify(supplier.to_dict()), 200

# -------------------- PURCHASE ROUTES --------------------

@inventory_bp.route('/purchases', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_purchase():
   
    data = request.get_json()
    supplier_id = data.get('supplier_id')
    store_id = data.get('store_id')
    items = data.get('items')

    if not supplier_id or not store_id or not items:
        return jsonify({"message": "Supplier ID, Store ID, and items are required."}), 400

    purchase = Purchase(
        supplier_id=supplier_id,
        store_id=store_id,
        date=data.get('date'),
        reference_number=data.get('reference_number'),
        is_paid=data.get('is_paid', False),
        notes=data.get('notes')
    )
    db.session.add(purchase)
    db.session.flush()  # Get purchase.id before committing

    for item in items:
        product_id = item.get('product_id')
        quantity = item.get('quantity')
        unit_cost = item.get('unit_cost')

        if not product_id or not quantity or not unit_cost:
            db.session.rollback() # Rollback the purchase if an item is invalid
            return jsonify({"message": "Each purchase item must have product_id, quantity, and unit_cost."}), 400

        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=product_id,
            quantity=quantity,
            unit_cost=unit_cost
        )
        db.session.add(purchase_item)

    db.session.commit()
    return jsonify(purchase.to_dict()), 201

@inventory_bp.route('/purchases', methods=['GET'])
def get_purchases():
  
    purchases = Purchase.query.all()
    return jsonify([p.to_dict() for p in purchases]), 200

@inventory_bp.route('/purchases/filter', methods=['GET'])
def filter_purchases():
  
    supplier_id = request.args.get('supplier_id', type=int)
    store_id = request.args.get('store_id', type=int)
    date = request.args.get('date') # Keep as string for direct comparison with date field

    query = Purchase.query
    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)
    if store_id:
        query = query.filter_by(store_id=store_id)
    if date:
        query = query.filter_by(date=date) # Assumes date in DB is string or auto-converted

    purchases = query.all()
    return jsonify([p.to_dict() for p in purchases]), 200

# -------------------- STOCK VIEW --------------------

@inventory_bp.route('/stock/<int:store_id>', methods=['GET'])
def get_stock_by_store(store_id):
    
    # You might want to add a check if the store_id actually exists in your Store model
    # from app.models import Store
    # if not Store.query.get(store_id):
    #     return jsonify({"message": "Store not found"}), 404

    store_products = StoreProduct.query.filter_by(store_id=store_id).all()

    results = []
    for sp in store_products:
        product = Product.query.get(sp.product_id)
        if product: # Ensure product exists before trying to access its attributes
            results.append({
                'product_id': product.id,
                'product_name': product.name,
                'sku': product.sku,
                'quantity_in_stock': sp.quantity_in_stock,
                'low_stock_threshold': sp.low_stock_threshold,
                'last_updated': sp.last_updated.isoformat() if sp.last_updated else None # Format datetime for JSON
            })

    return jsonify(results), 200