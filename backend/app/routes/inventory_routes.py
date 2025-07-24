from flask import Blueprint, jsonify, request
from app.models import db, Category, Product, Purchase, PurchaseItem, StoreProduct, Supplier, Store
from flask_jwt_extended import jwt_required # Assuming JWT protection will be added later
from sqlalchemy.orm import joinedload

inventory_bp = Blueprint('inventory', __name__, url_prefix="/api/inventory") # Added url_prefix for consistency

# --- CATEGORY ROUTES ---

@inventory_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    Get a list of all categories.
    ---
    tags:
      - Inventory - Categories
    responses:
      200:
        description: A list of categories.
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              name:
                type: string
                example: Electronics
              description:
                type: string
                nullable: true
                example: Gadgets and electronic devices
              is_deleted:
                type: boolean
                example: false
    """
    categories = Category.query.filter_by(is_deleted=False).all() # Assuming you filter out deleted categories
    return jsonify([category.to_dict() for category in categories]), 200

@inventory_bp.route('/categories', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_category():
    """
    Create a new category.
    ---
    tags:
      - Inventory - Categories
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: Name of the category.
              example: Clothing
            description:
              type: string
              nullable: true
              description: Optional description of the category.
              example: Apparel and accessories
    responses:
      201:
        description: Category created successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 2
            name:
              type: string
              example: Clothing
            description:
              type: string
              nullable: true
              example: Apparel and accessories
            is_deleted:
              type: boolean
              example: false
      400:
        description: Invalid input.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Name is required.
    """
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
    """
    Update an existing category.
    ---
    tags:
      - Inventory - Categories
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: The ID of the category to update.
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              description: New name for the category.
              example: Home Goods
            description:
              type: string
              nullable: true
              description: New description for the category.
              example: Items for home use
    responses:
      200:
        description: Category updated successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            name:
              type: string
              example: Home Goods
            description:
              type: string
              nullable: true
              example: Items for home use
            is_deleted:
              type: boolean
              example: false
      404:
        description: Category not found.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Not Found
    """
    category = Category.query.get_or_404(id)
    data = request.get_json()
    category.name = data.get('name', category.name)
    category.description = data.get('description', category.description)
    db.session.commit()
    return jsonify(category.to_dict()), 200

@inventory_bp.route('/categories/<int:id>', methods=['DELETE'])
# @jwt_required() # Uncomment if you want to protect this route
def delete_category(id):
    """
    Soft delete a category (mark as deleted).
    ---
    tags:
      - Inventory - Categories
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: The ID of the category to delete.
    responses:
      200:
        description: Category deleted successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Category deleted
      404:
        description: Category not found.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Not Found
    """
    category = Category.query.get_or_404(id)
    category.is_deleted = True # Assuming is_deleted is a field in your Category model
    db.session.commit()
    return jsonify({'message': 'Category deleted'}), 200

# -------------------- PRODUCT ROUTES --------------------

@inventory_bp.route('/products', methods=['GET'])
def get_products():
    """
    Get a list of all products.
    ---
    tags:
      - Inventory - Products
    responses:
      200:
        description: A list of products.
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              name:
                type: string
                example: Laptop
              description:
                type: string
                nullable: true
                example: High-performance computing device
              category_id:
                type: integer
                example: 1
              unit:
                type: string
                example: pcs
              sku:
                type: string
                nullable: true
                example: LAP-HP-001
              is_deleted:
                type: boolean
                example: false
    """
    products = Product.query.filter_by(is_deleted=False).all() # Assuming you filter out deleted products
    return jsonify([product.to_dict() for product in products]), 200

@inventory_bp.route('/products', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_product():
    """
    Create a new product.
    ---
    tags:
      - Inventory - Products
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
            - category_id
            - unit
          properties:
            name:
              type: string
              description: Name of the product.
              example: Smartphone
            description:
              type: string
              nullable: true
              description: Optional description of the product.
              example: Latest model with advanced features
            category_id:
              type: integer
              description: ID of the category the product belongs to.
              example: 1
            unit:
              type: string
              description: Unit of measurement for the product (e.g., pcs, kg, box).
              example: pcs
            sku:
              type: string
              nullable: true
              description: Stock Keeping Unit (unique identifier).
              example: SPH-SAM-007
    responses:
      201:
        description: Product created successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 2
            name:
              type: string
              example: Smartphone
            description:
              type: string
              nullable: true
              example: Latest model with advanced features
            category_id:
              type: integer
              example: 1
            unit:
              type: string
              example: pcs
            sku:
              type: string
              nullable: true
              example: SPH-SAM-007
            is_deleted:
              type: boolean
              example: false
      400:
        description: Invalid input or missing required fields.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Name, category_id, and unit are required.
    """
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
    """
    Update an existing product.
    ---
    tags:
      - Inventory - Products
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: The ID of the product to update.
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              description: New name for the product.
              example: Gaming Laptop
            description:
              type: string
              nullable: true
              description: New description for the product.
              example: High-end laptop for gaming
            category_id:
              type: integer
              description: New category ID for the product.
              example: 1
            unit:
              type: string
              description: New unit of measurement.
              example: units
            sku:
              type: string
              nullable: true
              description: New SKU for the product.
              example: LAP-GAM-002
    responses:
      200:
        description: Product updated successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            name:
              type: string
              example: Gaming Laptop
            description:
              type: string
              nullable: true
              example: High-end laptop for gaming
            category_id:
              type: integer
              example: 1
            unit:
              type: string
              example: units
            sku:
              type: string
              nullable: true
              example: LAP-GAM-002
            is_deleted:
              type: boolean
              example: false
      404:
        description: Product not found.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Not Found
    """
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
    """
    Soft delete a product (mark as deleted).
    ---
    tags:
      - Inventory - Products
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: The ID of the product to delete.
    responses:
      200:
        description: Product deleted successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Product deleted
      404:
        description: Product not found.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Not Found
    """
    product = Product.query.get_or_404(id)
    product.is_deleted = True # Assuming is_deleted is a field in your Product model
    db.session.commit()
    return jsonify({'message': 'Product deleted'}), 200

# -------------------- SUPPLIER ROUTES --------------------

# --- START ADDITION: SUPPLIER ROUTES ---

@inventory_bp.route('/suppliers', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_supplier():
    """Create a new supplier.
    ---
    tags:
      - Inventory - Suppliers
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
            - contact_person
            - email
            - phone
            - address
          properties:
            name:
              type: string
              description: Name of the supplier.
              example: Tech Wholesale Ltd.
            contact_person:
              type: string
              description: Name of the contact person at the supplier.
              example: John Smith
            email:
              type: string
              format: email
              description: Email address of the supplier.
              example: contact@techwholesale.com
            phone:
              type: string
              description: Phone number of the supplier.
              example: +1-555-123-4567
            address:
              type: string
              description: Physical address of the supplier.
              example: 123 Tech Lane, Silicon Valley
            notes:
              type: string
              nullable: true
              description: Any additional notes about the supplier.
              example: Key supplier for electronics.
    responses:
      201:
        description: Supplier created successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            name:
              type: string
              example: Tech Wholesale Ltd.
      400:
        description: Invalid input or missing required fields.
      409:
        description: Supplier with this name or email already exists.
      500:
        description: An error occurred while saving the supplier.
    """
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
    """Retrieve all suppliers.
    ---
    tags:
      - Inventory - Suppliers
    responses:
      200:
        description: A list of all suppliers.
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              name:
                type: string
                example: Tech Wholesale Ltd.
              contact_person:
                type: string
                example: John Smith
              email:
                type: string
                example: contact@techwholesale.com
              phone:
                type: string
                example: +1-555-123-4567
              address:
                type: string
                example: 123 Tech Lane, Silicon Valley
              notes:
                type: string
                nullable: true
                example: Key supplier for electronics.
    """
    suppliers = Supplier.query.all()
    return jsonify([supplier.to_dict() for supplier in suppliers]), 200

@inventory_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
def get_supplier(supplier_id):
    """Retrieve a single supplier by ID.
    ---
    tags:
      - Inventory - Suppliers
    parameters:
      - name: supplier_id
        in: path
        type: integer
        required: true
        description: ID of the supplier to retrieve.
    responses:
      200:
        description: Supplier found.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            name:
              type: string
              example: Tech Wholesale Ltd.
      404:
        description: Supplier not found.
    """
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return jsonify({"message": "Supplier not found"}), 404
    return jsonify(supplier.to_dict()), 200

# -------------------- PURCHASE ROUTES --------------------

@inventory_bp.route('/purchases', methods=['POST'])
# @jwt_required() # Uncomment if you want to protect this route
def create_purchase():
    """
    Create a new purchase order with multiple items.
    ---
    tags:
      - Inventory - Purchases
    # security:
    #   - Bearer: [] # Uncomment and ensure JWT required if route is protected
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - supplier_id
            - store_id
            - items
          properties:
            supplier_id:
              type: integer
              description: ID of the supplier for this purchase.
              example: 101
            store_id:
              type: integer
              description: ID of the store receiving the purchased items.
              example: 1
            date:
              type: string
              format: date
              nullable: true
              description: Date of the purchase (YYYY-MM-DD). Defaults to current date.
              example: 2024-07-18
            reference_number:
              type: string
              nullable: true
              description: A unique reference number for the purchase.
              example: PO-2024-001
            is_paid:
              type: boolean
              description: Whether the purchase has been paid.
              default: false
              example: false
            notes:
              type: string
              nullable: true
              description: Any additional notes for the purchase.
              example: Urgent order for high-demand items
            items:
              type: array
              description: List of products purchased.
              items:
                type: object
                required:
                  - product_id
                  - quantity
                  - unit_cost
                properties:
                  product_id:
                    type: integer
                    description: ID of the product purchased.
                    example: 501
                  quantity:
                    type: integer
                    minimum: 1
                    description: Quantity of the product purchased.
                    example: 10
                  unit_cost:
                    type: number
                    format: float
                    minimum: 0
                    description: Cost per unit of the product.
                    example: 25.50
    responses:
      201:
        description: Purchase created successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            supplier_id:
              type: integer
              example: 101
            store_id:
              type: integer
              example: 1
            date:
              type: string
              format: date
              example: 2024-07-18
            reference_number:
              type: string
              example: PO-2024-001
            is_paid:
              type: boolean
              example: false
            notes:
              type: string
              nullable: true
              example: Urgent order for high-demand items
            # Assuming to_dict() for Purchase also includes purchase_items or fetches them
            purchase_items:
              type: array
              items:
                type: object
                properties:
                  product_id:
                    type: integer
                    example: 501
                  quantity:
                    type: integer
                    example: 10
                  unit_cost:
                    type: number
                    format: float
                    example: 25.50
      400:
        description: Invalid input or missing required fields.
        schema:
          type: object
          properties:
            message:
              type: string
              example: Supplier ID, Store ID, and items are required.
    """
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
    """
    Get a list of all purchase orders.
    ---
    tags:
      - Inventory - Purchases
    responses:
      200:
        description: A list of purchase orders.
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              supplier_id:
                type: integer
                example: 101
              store_id:
                type: integer
                example: 1
              date:
                type: string
                format: date
                example: 2024-07-18
              reference_number:
                type: string
                example: PO-2024-001
              is_paid:
                type: boolean
                example: false
              notes:
                type: string
                nullable: true
                example: null
    """
    purchases = Purchase.query.all()
    return jsonify([p.to_dict() for p in purchases]), 200

@inventory_bp.route('/purchases/filter', methods=['GET'])
def filter_purchases():
    """
    Filter purchase orders by supplier, store, or date.
    ---
    tags:
      - Inventory - Purchases
    parameters:
      - name: supplier_id
        in: query
        type: integer
        required: false
        description: Filter purchases by supplier ID.
        example: 101
      - name: store_id
        in: query
        type: integer
        required: false
        description: Filter purchases by store ID.
        example: 1
      - name: date
        in: query
        type: string
        format: date
        required: false
        description: Filter purchases by date (YYYY-MM-DD).
        example: 2024-07-18
    responses:
      200:
        description: A list of filtered purchase orders.
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              supplier_id:
                type: integer
                example: 101
              store_id:
                type: integer
                example: 1
              date:
                type: string
                format: date
                example: 2024-07-18
              reference_number:
                type: string
                example: PO-2024-001
              is_paid:
                type: boolean
                example: false
              notes:
                type: string
                nullable: true
                example: null
    """
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
    """
    Get current stock levels for products in a specific store, including price and product details.
    ---
    tags:
      - Inventory - Stock
    parameters:
      - name: store_id
        in: path
        type: integer
        required: true
        description: The ID of the store to retrieve stock for.
        example: 1
      - name: search
        in: query
        type: string
        description: Optional search term for product name or SKU.
    responses:
      200:
        description: A list of products and their stock details in the specified store.
        schema:
          type: array
          items:
            type: object
            properties:
              store_product_id: # <-- NEW: The ID of the StoreProduct instance
                type: integer
                example: 101
              product_id:
                type: integer
                example: 1
              product_name:
                type: string
                example: Laptop
              sku:
                type: string
                nullable: true
                example: LAP-HP-001
              unit: # <-- NEW: Unit from Product model
                type: string
                example: pcs
              price: # <-- NEW: Price from StoreProduct
                type: number
                format: float
                example: 1200.50
              quantity_in_stock:
                type: integer
                example: 50
              low_stock_threshold:
                type: integer
                example: 10
              last_updated:
                type: string
                format: date-time
                nullable: true
                example: 2024-07-18T12:00:00Z
    """
    # Optional: Check if the store_id actually exists
    store = Store.query.get(store_id)
    if not store:
        return jsonify({"message": "Store not found"}), 404

    # Use joinedload to efficiently fetch related Product data
    query = StoreProduct.query.options(joinedload(StoreProduct.product)).filter_by(store_id=store_id, is_deleted=False)

    # Add search functionality based on product name or SKU
    search_term = request.args.get('search')
    if search_term:
        search_pattern = f"%{search_term}%"
        query = query.join(Product).filter(
            (Product.name.ilike(search_pattern)) |
            (Product.sku.ilike(search_pattern))
        )

    store_products = query.all()

    results = []
    for sp in store_products:
        if sp.product: # Ensure the joined product exists
            results.append({
                'store_product_id': sp.id, # <-- Crucial for frontend keying and sale item payload
                'product_id': sp.product.id,
                'product_name': sp.product.name,
                'sku': sp.product.sku,
                'unit': sp.product.unit, # Include unit
                'price': float(sp.price), # Convert Decimal to float for JSON
                'quantity_in_stock': sp.quantity_in_stock,
                'low_stock_threshold': sp.low_stock_threshold,
                'last_updated': sp.last_updated.isoformat() if sp.last_updated else None
            })

    return jsonify(results), 200