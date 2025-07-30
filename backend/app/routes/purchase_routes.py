from flask import Blueprint, request, jsonify, abort, current_app # Added current_app for logging
from datetime import datetime, timezone, timedelta
from app import db
from app.models import (
    Store, StoreProduct, SupplyRequest, StockTransfer,
    StockTransferItem, Product, User,
    SupplyRequestStatus, StockTransferStatus,
    # --- ADDED THESE IMPORTS TO FIX 'NameError' ---
    Purchase, PurchaseItem, Supplier # <--- ADDED Purchase, PurchaseItem, Supplier
    # --- END ADDED IMPORTS ---
)
from sqlalchemy import or_, func, and_

purchase_bp = Blueprint("purchase", __name__, url_prefix="/api/purchase/")

# Consolidated OPTIONS handling for the entire blueprint
@purchase_bp.before_request
def handle_options_requests():
    if request.method == "OPTIONS":
        return '', 204

# Helper function to get a dummy user and role for debugging without authentication
# This function remains for routes that still need a "user context" for their logic,
# even if it's not a truly authenticated user via JWT.
def get_debug_user_info():
    # In a real application, you would replace this with actual authentication.
    # For debugging/testing without JWT, it simulates a user.
    return 1, "admin" # Assuming a default 'admin' user with ID 1 exists and is active.

# Helper function to get user's accessible store IDs (still used by non-public routes for context)
def get_user_accessible_store_ids(user_id, user_role):
    # This logic determines what stores a user can manage/view based on their role
    if user_role == "admin":
        return [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    elif user_role == "merchant":
        return [s.id for s in Store.query.filter_by(merchant_id=user_id, is_deleted=False).all()]
    elif user_role in ("clerk", "cashier"):
        user = User.query.get(user_id)
        if user and user.store_id and not user.store.is_deleted:
            return [user.store_id]
    return []

# Helper function to check if user has access to a specific store (still used by non-public routes for context)
def check_store_access(store_id, current_user_id, current_user_role):
    accessible_ids = get_user_accessible_store_ids(current_user_id, current_user_role)
    if store_id not in accessible_ids:
        abort(403, description="Forbidden: You do not have access to this store.")


# --- Public Route: List all purchases ---
@purchase_bp.route("/", methods=["GET"])
def list_store_purchases():
    """
    Lists all purchases. This route is now **fully public** and does not require authentication.
    ---
    tags:
      - Purchases
    parameters:
      - in: query
        name: page
        schema: {type: integer, default: 1}
      - in: query
        name: per_page
        schema: {type: integer, default: 20}
      - in: query
        name: store_id
        schema: {type: integer}
        description: Optional. Filter by a specific store ID.
      - in: query
        name: supplier_id
        schema: {type: integer}
        description: Filter by supplier ID.
      - in: query
        name: is_paid
        schema: {type: boolean}
        description: Filter by payment status (true/false).
      - in: query
        name: start_date
        schema: {type: string, format: date}
        description: Filter purchases from this date (YYYY-MM-DD).
      - in: query
        name: end_date
        schema: {type: string, format: date}
        description: Filter purchases up to this date (YYYY-MM-DD).
    responses:
      200:
        description: A paginated list of purchases.
        schema:
          type: object
          properties:
            purchases:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  store_id: {type: integer}
                  store_name: {type: string}
                  supplier_id: {type: integer}
                  supplier_name: {type: string}
                  reference_number: {type: string, nullable: true}
                  date: {type: string, format: date}
                  total_amount: {type: number, format: float}
                  is_paid: {type: boolean}
                  notes: {type: string, nullable: true}
                  created_at: {type: string, format: date-time}
                  updated_at: {type: string, format: date-time}
            total_pages: {type: integer}
            current_page: {type: integer}
            total_items: {type: integer}
      400: {description: Bad Request}
    """
    # --- REMOVED: No get_debug_user_info() or user-based access control for this public route ---
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    filter_store_id = request.args.get('store_id', type=int)
    filter_supplier_id = request.args.get('supplier_id', type=int)
    filter_is_paid = request.args.get('is_paid', type=str)
    start_date_str = request.args.get('start_date', type=str)
    end_date_str = request.args.get('end_date', type=str)

    purchases_query = Purchase.query # Fixed: Purchase model is now imported

    # Filtering by store_id without access control
    if filter_store_id:
        purchases_query = purchases_query.filter_by(store_id=filter_store_id)

    if filter_supplier_id:
        purchases_query = purchases_query.filter_by(supplier_id=filter_supplier_id)
    
    if filter_is_paid is not None:
        if filter_is_paid.lower() == 'true':
            purchases_query = purchases_query.filter_by(is_paid=True)
        elif filter_is_paid.lower() == 'false':
            purchases_query = purchases_query.filter_by(is_paid=False)
        else:
            abort(400, "Invalid value for 'is_paid'. Must be 'true' or 'false'.")
    
    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            purchases_query = purchases_query.filter(Purchase.date >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            purchases_query = purchases_query.filter(Purchase.date <= end_date)
    except ValueError:
        abort(400, "Invalid date format. Use YYYY-MM-DD.")

    purchases_query = purchases_query.order_by(Purchase.date.desc())

    paginated_purchases = purchases_query.paginate(page=page, per_page=per_page, error_out=False)

    purchases_data = []
    for p in paginated_purchases.items:
        purchases_data.append({
            "id": p.id,
            "store_id": p.store_id,
            "store_name": p.store.name if p.store else None,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else None,
            "reference_number": p.reference_number,
            "date": p.date.isoformat() if p.date else None,
            "total_amount": float(p.total_amount),
            "is_paid": p.is_paid,
            "notes": p.notes,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return jsonify({
        "purchases": purchases_data,
        "total_pages": paginated_purchases.pages,
        "current_page": paginated_purchases.page,
        "total_items": paginated_purchases.total
    }), 200

# Create a new purchase with items (Still uses debug user for internal logic and access checks)
@purchase_bp.route("/", methods=["POST"])
def create_purchase():
    """
    Creates a new purchase record with associated items.
    Updates product stock in the respective store.
    ---
    tags:
      - Purchases
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - store_id
            - items
          properties:
            store_id:
              type: integer
              description: The ID of the store making the purchase.
              example: 1
            supplier_id:
              type: integer
              description: The ID of the supplier for this purchase.
              example: 5
            reference_number:
              type: string
              nullable: true
              description: An optional reference number for the purchase.
              example: "PO2023-001"
            date:
              type: string
              format: date
              nullable: true
              description: The date of the purchase (YYYY-MM-DD). Defaults to current date.
              example: "2023-10-26"
            notes:
              type: string
              nullable: true
              description: Any additional notes for the purchase.
              example: "Urgent restock for holiday season"
            is_paid:
              type: boolean
              nullable: true
              description: Whether the purchase has been paid. Defaults to false.
              example: false
            items:
              type: array
              description: A list of products purchased.
              items:
                type: object
                required:
                  - product_id
                  - quantity
                  - unit_cost
                properties:
                  product_id:
                    type: integer
                    description: The ID of the product.
                    example: 101
                  quantity:
                    type: integer
                    description: The quantity of the product purchased.
                    example: 100
                  unit_cost:
                    type: number
                    format: float
                    description: The cost per unit of the product.
                    example: 5.50
    responses:
      201:
        description: Purchase recorded successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            purchase_id: {type: integer}
      400:
        description: Bad request, e.g., missing data, invalid format, or insufficient permissions.
      404:
        description: Store, Supplier, or Product not found.
    """
    # This route still uses the debug user for internal logic and access checks related to the 'current user' context.
    user_id, user_role = get_debug_user_info()
    user = User.query.get(user_id)
    if not user:
        abort(401, description="Debug user not found in the system. Ensure user with ID 1 exists.")

    data = request.get_json() or {}
    store_id = data.get("store_id")
    supplier_id = data.get("supplier_id")
    reference_number = data.get("reference_number")
    date_str = data.get("date")
    notes = data.get("notes")
    is_paid = data.get("is_paid", False)
    items = data.get("items", [])

    if not store_id:
        abort(400, "Store ID is required.")
    # You might want to uncomment this if supplier_id is strictly required for POST
    if not supplier_id:
        abort(400, "Supplier ID is required.")
    if not items:
        abort(400, "At least one item is required for a purchase.")

    # Validate store and access (using dummy user for check)
    store = Store.query.get_or_404(store_id, description="Store not found.")
    check_store_access(store.id, user_id, user_role) # This access check remains
    
    if not store.is_active or store.is_deleted:
        abort(400, "Cannot create purchase for an inactive or deleted store.")

    # Validate supplier if provided
    supplier = None
    if supplier_id:
        supplier = Supplier.query.get_or_404(supplier_id, description="Supplier not found.")

    try:
        purchase_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.now(timezone.utc).date()
    except ValueError:
        abort(400, "Invalid date format. Please use YYYY-MM-DD.")

    purchase = Purchase(
        store_id=store_id,
        supplier_id=supplier_id,
        reference_number=reference_number,
        date=purchase_date,
        notes=notes,
        is_paid=is_paid,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.session.add(purchase)
    db.session.flush()

    total_purchase_amount = 0.0

    for item_data in items:
        product_id = item_data.get("product_id")
        quantity = item_data.get("quantity")
        unit_cost = item_data.get("unit_cost")

        if not all([product_id, quantity is not None, unit_cost is not None]):
            db.session.rollback()
            abort(400, f"Invalid item data: product_id, quantity, and unit_cost are required for each item. Received: {item_data}")

        try:
            quantity = int(quantity)
            unit_cost = float(unit_cost)
            if quantity <= 0:
                db.session.rollback()
                abort(400, f"Quantity for product ID {product_id} must be a positive integer.")
            if unit_cost < 0:
                db.session.rollback()
                abort(400, f"Unit cost for product ID {product_id} cannot be negative.")
        except ValueError:
            db.session.rollback()
            abort(400, f"Invalid quantity or unit_cost type for item {product_id}.")

        product = Product.query.get_or_404(product_id, description=f"Product with ID {product_id} not found.")

        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=product.id,
            quantity=quantity,
            unit_cost=unit_cost
        )
        db.session.add(purchase_item)
        total_purchase_amount += (quantity * unit_cost)

        store_product = StoreProduct.query.filter_by(
            store_id=store.id,
            product_id=product.id
        ).first()

        if store_product:
            store_product.quantity += quantity
            store_product.updated_at = datetime.now(timezone.utc)
        else:
            new_store_product = StoreProduct(
                store_id=store.id,
                product_id=product.id,
                quantity=quantity,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.session.add(new_store_product)
    
    purchase.total_amount = total_purchase_amount
    purchase.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    return jsonify({"message": "Purchase recorded successfully", "purchase_id": purchase.id}), 201


# View single purchase (Still uses debug user for internal logic and access checks)
@purchase_bp.route("/<int:purchase_id>", methods=["GET"])
def get_purchase(purchase_id):
    """
    Retrieves details of a specific purchase, including its items.
    ---
    tags:
      - Purchases
    parameters:
      - in: path
        name: purchase_id
        schema: {type: integer}
        required: true
        description: The ID of the purchase to retrieve.
    responses:
      200:
        description: Purchase details.
        schema:
          type: object
          properties:
            id: {type: integer}
            store_id: {type: integer}
            store_name: {type: string}
            supplier_id: {type: integer}
            supplier_name: {type: string}
            reference_number: {type: string, nullable: true}
            date: {type: string, format: date}
            total_amount: {type: number, format: float}
            is_paid: {type: boolean}
            notes: {type: string, nullable: true}
            created_at: {type: string, format: date-time}
            updated_at: {type: string, format: date-time}
            items:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  product_id: {type: integer}
                  product_name: {type: string}
                  quantity: {type: integer}
                  unit_cost: {type: number, format: float}
                  total_cost: {type: number, format: float}
      403: {description: Forbidden, user does not have access to this purchase's store.}
      404: {description: Purchase not found.}
    """
    user_id, user_role = get_debug_user_info()
    user = User.query.get(user_id)
    if not user:
        abort(401, description="Debug user not found.")

    purchase = Purchase.query.get_or_404(purchase_id)

    # Check if user has access to the store associated with the purchase
    check_store_access(purchase.store_id, user_id, user_role)

    result = purchase.to_dict()
    result["store_name"] = purchase.store.name if purchase.store else None
    result["supplier_name"] = purchase.supplier.name if purchase.supplier else None
    result["items"] = []
    for item in purchase.purchase_items:
        item_dict = item.to_dict()
        item_dict["product_name"] = item.product.name if item.product else None
        result["items"].append(item_dict)

    return jsonify(result), 200

# Mark purchase as paid / Update purchase details (Still uses debug user for internal logic and access checks)
@purchase_bp.route("/<int:purchase_id>", methods=["PATCH"])
def update_purchase(purchase_id):
    """
    Updates details of an existing purchase, including its payment status or notes.
    ---
    tags:
      - Purchases
    parameters:
      - in: path
        name: purchase_id
        schema: {type: integer}
        required: true
        description: The ID of the purchase to update.
      - in: body
        name: body
        schema:
          type: object
          properties:
            is_paid:
              type: boolean
              description: Set the payment status of the purchase.
              example: true
            notes:
              type: string
              nullable: true
              description: Update notes for the purchase.
              example: "Payment cleared via bank transfer."
            reference_number:
              type: string
              nullable: true
              description: Update the reference number.
              example: "PO2023-001-PAID"
    responses:
      200:
        description: Purchase updated successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            purchase_id: {type: integer}
            purchase:
              type: object
              properties:
                id: {type: integer}
                is_paid: {type: boolean}
                notes: {type: string, nullable: true}
      400: {description: Bad request, e.g., invalid data.}
      403: {description: Forbidden, user does not have access to this purchase's store.}
      404: {description: Purchase not found.}
    """
    user_id, user_role = get_debug_user_info()
    user = User.query.get(user_id)
    if not user:
        abort(401, description="Debug user not found.")

    purchase = Purchase.query.get_or_404(purchase_id)

    # Check if user has access to the store associated with the purchase
    check_store_access(purchase.store_id, user_id, user_role)

    data = request.get_json() or {}

    if "is_paid" in data:
        if not isinstance(data["is_paid"], bool):
            abort(400, "is_paid must be a boolean.")
        purchase.is_paid = data["is_paid"]
    
    if "notes" in data:
        purchase.notes = data["notes"]
    
    if "reference_number" in data:
        purchase.reference_number = data["reference_number"]

    purchase.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Purchase updated.", "purchase_id": purchase.id, "purchase": purchase.to_dict()}), 200

# Get purchase summary for dashboard (e.g., total purchases last 30 days, unpaid purchases)
@purchase_bp.route("/summary", methods=["GET"])
def get_purchase_summary():
    """
    Provides a summary of purchase data for the dashboard.
    Includes total purchase amount, count, and unpaid amounts for accessible stores.
    ---
    tags:
      - Dashboard
    parameters:
      - in: query
        name: period_days
        schema: {type: integer, default: 30}
        description: Number of days to consider for recent purchases.
      - in: query
        name: store_id
        schema: {type: integer}
        description: Optional. Filter summary for a specific store (must be accessible).
    responses:
      200:
        description: Purchase summary data.
        schema:
          type: object
          properties:
            total_purchases_count: {type: integer, description: "Total number of purchases in the period."}
            total_purchases_amount: {type: number, format: float, description: "Total monetary value of purchases in the period."}
            unpaid_purchases_count: {type: integer, description: "Total number of unpaid purchases."}
            total_unpaid_amount: {type: number, format: float, description: "Total monetary value of unpaid purchases."}
            avg_purchase_value: {type: number, format: float, description: "Average value of a purchase in the period."}
      400: {description: Bad Request}
    """
    user_id, user_role = get_debug_user_info()
    user = User.query.get(user_id)
    if not user:
        abort(401, description="Debug user not found.")

    period_days = request.args.get('period_days', 30, type=int)
    filter_store_id = request.args.get('store_id', type=int)

    if period_days <= 0:
        abort(400, "period_days must be a positive integer.")

    accessible_store_ids = get_user_accessible_store_ids(user_id, user_role)
    if not accessible_store_ids:
        return jsonify({
            "total_purchases_count": 0,
            "total_purchases_amount": 0.0,
            "unpaid_purchases_count": 0,
            "total_unpaid_amount": 0.0,
            "avg_purchase_value": 0.0
        }), 200

    base_query = Purchase.query.filter(Purchase.store_id.in_(accessible_store_ids))

    if filter_store_id:
        if filter_store_id not in accessible_store_ids:
            abort(403, description="Forbidden: You do not have access to this store.")
        base_query = base_query.filter_by(store_id=filter_store_id)
    
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=period_days)

    recent_purchases_query = base_query.filter(
        and_(Purchase.date >= start_date, Purchase.date <= end_date)
    )

    total_purchases_count = recent_purchases_query.count()
    total_purchases_amount = recent_purchases_query.with_entities(func.sum(Purchase.total_amount)).scalar() or 0.0
    
    avg_purchase_value = total_purchases_amount / total_purchases_count if total_purchases_count > 0 else 0.0

    unpaid_purchases_query = base_query.filter_by(is_paid=False)

    unpaid_purchases_count = unpaid_purchases_query.count()
    total_unpaid_amount = unpaid_purchases_query.with_entities(func.sum(Purchase.total_amount)).scalar() or 0.0

    return jsonify({
        "total_purchases_count": total_purchases_count,
        "total_purchases_amount": float(total_purchases_amount),
        "unpaid_purchases_count": unpaid_purchases_count,
        "total_unpaid_amount": float(total_unpaid_amount),
        "avg_purchase_value": float(avg_purchase_value)
    }), 200