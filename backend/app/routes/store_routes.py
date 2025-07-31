from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone # Use timezone.utc for datetime.utcnow() replacement
from app import db
from app.models import (
    Store, StoreProduct, SupplyRequest, StockTransfer, # Added StockTransfer
    StockTransferItem, Product, User,
    SupplyRequestStatus, StockTransferStatus
)
from app.routes.auth_routes import role_required # Make sure this import path is correct
from sqlalchemy import or_ # For complex queries like search

store_bp = Blueprint("stores", __name__, url_prefix="/api/stores")

# Helper function to get user's accessible store IDs
# This logic determines what stores a user can manage/view based on their role
def get_user_accessible_store_ids(user_id, user_role):
    if user_role == "admin":
        # Admin can access all active stores
        return [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    elif user_role == "merchant":
        # Merchant can only access stores where they are the merchant_id
        # Assuming Store model has a merchant_id column
        return [s.id for s in Store.query.filter_by(merchant_id=user_id, is_deleted=False).all()]
    elif user_role in ("clerk", "cashier"):
        # Clerks/Cashiers can only access their assigned store
        user = User.query.get(user_id)
        if user and user.store_id and not user.store.is_deleted:
            return [user.store_id]
    return []

# Helper function to check if user has access to a specific store
def check_store_access(store_id, current_user_id, current_user_role):
    accessible_ids = get_user_accessible_store_ids(current_user_id, current_user_role)
    if store_id not in accessible_ids:
        abort(403, description="Forbidden: You do not have access to this store.")


# Create a new store (Merchant only)
@store_bp.route("/", methods=["POST"]) # Changed route from /store/create for RESTfulness
@jwt_required()
@role_required("merchant")
def create_store():
    """
    Create a new store.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: The name of the new store.
              example: "MyDuka Downtown"
            address:
              type: string
              description: The physical address of the store.
              example: "123 Market Street, Nairobi"
            is_active:
              type: boolean
              description: Initial active status of the store. Defaults to true.
              example: true
    responses:
      201:
        description: Store created successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            store:
              type: object
              properties:
                id: {type: integer}
                name: {type: string}
                address: {type: string}
                is_active: {type: boolean}
                is_deleted: {type: boolean}
      400:
        description: Bad request, e.g., missing store name.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' role.
    """
    user_id = get_jwt_identity() # User ID of the logged-in merchant
    data = request.get_json() or {}
    name = data.get("name")
    address = data.get("address")
    is_active = data.get("is_active", True) # Default to active

    if not name or not isinstance(name, str) or not name.strip():
        abort(400, description="Store name is required and must be a non-empty string.")

    # Check if a store with this name already exists for this merchant (optional, for uniqueness)
    existing_store = Store.query.filter_by(name=name.strip(), merchant_id=user_id, is_deleted=False).first()
    if existing_store:
        abort(409, description="A store with this name already exists for your account.")

    store = Store(
        name=name.strip(),
        address=address,
        merchant_id=user_id, # Assign the current merchant as the owner
        is_active=is_active,
        is_deleted=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.session.add(store)
    db.session.commit()
    return jsonify({"message": "Store created successfully", "store": store.to_dict()}), 201


# Get single store details
@store_bp.route("/<int:store_id>", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin", "clerk", "cashier")
def get_store(store_id):
    """
    Retrieves details of a specific store.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema: {type: integer}
        required: true
        description: The ID of the store to retrieve.
    responses:
      200:
        description: Store details.
        schema:
          type: object
          properties:
            id: {type: integer}
            name: {type: string}
            address: {type: string}
            merchant_id: {type: integer}
            is_active: {type: boolean}
            is_deleted: {type: boolean}
            created_at: {type: string, format: date-time}
            updated_at: {type: string, format: date-time}
      401: {description: Unauthorized}
      403: {description: Forbidden, user does not have access to this store.}
      404: {description: Store not found.}
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    store = Store.query.get_or_404(store_id)

    # Authorization check
    check_store_access(store.id, current_user_id, current_user.role)

    return jsonify(store.to_dict()), 200

# Update store (PATCH for partial updates, including active/delete status)
@store_bp.route("/<int:store_id>", methods=["PATCH"])
@jwt_required()
@role_required("merchant", "admin")
def update_store(store_id):
    """
    Updates an existing store's information.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema: {type: integer}
        required: true
        description: The ID of the store to update.
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
              description: The new name for the store.
              example: "MyDuka CBD"
            address:
              type: string
              description: The new address for the store.
              example: "456 City Center, Nairobi"
            is_active:
              type: boolean
              description: Set store active/inactive status.
              example: false
    responses:
      200:
        description: Store updated successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            store:
              type: object
              description: The updated store details.
      400: {description: Bad request, e.g., invalid data format.}
      401: {description: Unauthorized, JWT token is missing or invalid.}
      403: {description: Forbidden, user does not have access to this store.}
      404: {description: Store not found.}
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    store = Store.query.get_or_404(store_id)

    # Authorization check
    if current_user.role == "merchant":
        if store.merchant_id != current_user_id:
            abort(403, description="Forbidden: Merchant does not own this store.")
    # Admin is allowed by @role_required

    data = request.get_json() or {}

    if "name" in data:
        if not isinstance(data["name"], str) or not data["name"].strip():
            abort(400, "Store name must be a non-empty string.")
        store.name = data["name"].strip()
    if "address" in data:
        store.address = data["address"]
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            abort(400, "is_active must be a boolean.")
        store.is_active = data["is_active"]
    
    store.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Store updated", "store": store.to_dict()}), 200

# Soft delete a store
@store_bp.route("/<int:store_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant", "admin")
def soft_delete_store(store_id): # Renamed function to avoid conflict and be more descriptive
    """
    Soft-deletes a store by setting its 'is_deleted' flag to True.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema: {type: integer}
        required: true
        description: The ID of the store to soft-delete.
    responses:
      200:
        description: Store soft-deleted successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            store_id: {type: integer}
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have access to this store.
      404:
        description: Store not found.
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    store = Store.query.get_or_404(store_id)

    # Authorization check
    if current_user.role == "merchant":
        if store.merchant_id != current_user_id:
            abort(403, description="Forbidden: Merchant does not own this store.")
    # Admin is allowed by @role_required

    if store.is_deleted:
        return jsonify({"message": "Store is already soft-deleted.", "store_id": store.id}), 200

    store.is_deleted = True
    store.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Store soft-deleted", "store_id": store.id}), 200


# List all stores with pagination, search, and filtering
@store_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin") # Clerks/Cashiers typically don't list all stores
def list_stores():
    """
    Lists stores with pagination and filtering for accessible stores.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: query
        name: page
        schema: {type: integer, default: 1}
      - in: query
        name: per_page
        schema: {type: integer, default: 20}
      - in: query
        name: search
        schema: {type: string}
        description: Search by store name or address.
      - in: query
        name: is_active
        schema: {type: boolean}
        description: Filter by active status (true/false).
      - in: query
        name: is_deleted
        schema: {type: boolean}
        description: Filter by deleted status (true/false). Admins typically see deleted.
    responses:
      200:
        description: A paginated list of stores.
        schema:
          type: object
          properties:
            stores:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  name: {type: string}
                  address: {type: string}
                  is_active: {type: boolean}
                  is_deleted: {type: boolean}
                  created_at: {type: string, format: date-time}
                  updated_at: {type: string, format: date-time}
            total_pages: {type: integer}
            current_page: {type: integer}
            total_items: {type: integer}
      401: {description: Unauthorized}
      403: {description: Forbidden}
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_query = request.args.get('search', type=str)
    is_active_filter = request.args.get('is_active', type=str) # Comes as string 'true'/'false'
    is_deleted_filter = request.args.get('is_deleted', type=str) # Comes as string 'true'/'false'

    stores_query = Store.query # Start with all stores

    # --- REMOVE THIS ENTIRE BLOCK ---
    # if current_user.role == "merchant":
    #     stores_query = stores_query.filter_by(merchant_id=current_user_id)
    # --------------------------------

    # The existing logic correctly handles filtering by is_deleted for admins
    # and ensures non-admins only see non-deleted stores.
    # Since 'merchant' is now a system-wide admin, they will fall under the 'admin'
    # logic or the general 'see all non-deleted' logic depending on where you
    # define their permissions.
    # Given they are in @role_required("merchant", "admin"), they have admin-like access here.


    if search_query:
        stores_query = stores_query.filter(
            (Store.name.ilike(f'%{search_query}%')) |
            (Store.address.ilike(f'%{search_query}%'))
        )
    
    if is_active_filter is not None:
        if is_active_filter.lower() == 'true':
            stores_query = stores_query.filter_by(is_active=True)
        elif is_active_filter.lower() == 'false':
            stores_query = stores_query.filter_by(is_active=False)
        else:
            abort(400, "Invalid value for 'is_active'. Must be 'true' or 'false'.")

    # Admins and (now) merchants (as system-wide admins) can explicitly filter by is_deleted.
    # Other roles (clerk/cashier if they could ever hit this endpoint) would default to is_deleted=False.
    if is_deleted_filter is not None and (current_user.role == "admin" or current_user.role == "merchant"):
        if is_deleted_filter.lower() == 'true':
            stores_query = stores_query.filter_by(is_deleted=True)
        elif is_deleted_filter.lower() == 'false':
            stores_query = stores_query.filter_by(is_deleted=False)
        else:
            abort(400, "Invalid value for 'is_deleted'. Must be 'true' or 'false'.")
    elif current_user.role != "admin" and current_user.role != "merchant": # Only show non-deleted for other specific roles if they access
        stores_query = stores_query.filter_by(is_deleted=False)
    # If a merchant is system-wide admin, they'd typically see non-deleted by default,
    # but can filter to see deleted if allowed by the API args and the if condition above.
    # The existing logic for is_deleted looks generally fine for this purpose.


    stores_query = stores_query.order_by(Store.name)

    paginated_stores = stores_query.paginate(page=page, per_page=per_page, error_out=False)

    stores_data = [s.to_dict() for s in paginated_stores.items]

    return jsonify({
        'stores': stores_data,
        'total_pages': paginated_stores.pages,
        'current_page': paginated_stores.page,
        'total_items': paginated_stores.total
    }), 200

# Invite user to store
@store_bp.route("/<int:store_id>/invite", methods=["POST"])
@jwt_required()
@role_required("merchant", "admin")
def invite_user(store_id):
    """
    Invites a new user to a specific store.
    ---
    tags:
      - Stores
      - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema:
          type: integer
        required: true
        description: The ID of the store to invite the user to.
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
            - role
          properties:
            email:
              type: string
              format: email
              description: The email address of the user to invite.
              example: "newuser@example.com"
            role:
              type: string
              enum: [clerk, cashier] # Admin role cannot be assigned this way, for security
              description: The role to assign to the invited user within the store.
              example: "clerk"
            name:
              type: string
              description: The name of the invited user.
              example: "Jane Doe"
    responses:
      201:
        description: Invitation sent successfully, user created.
        schema:
          type: object
          properties:
            message: {type: string}
            user_id: {type: integer}
      400:
        description: Bad request, e.g., missing email/role or invalid role.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' or 'admin' role, or access to store.
      404:
        description: Store not found.
      409:
        description: User with this email already exists.
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    store = Store.query.get_or_404(store_id, description="Store not found.")

    # Authorization check: Merchant must own the store, Admin can invite to any store
    if current_user.role == "merchant":
        if store.merchant_id != current_user_id:
            abort(403, description="Forbidden: Merchant does not own this store.")
    
    data = request.get_json() or {}
    email = data.get("email")
    role = data.get("role")
    name = data.get("name") # Added name for the user

    if not email or not role or not name:
        abort(400, "Name, email, and role are required.")
    if role not in ("clerk", "cashier"): # Admins cannot be created via store invite for security
        abort(400, "Role must be one of: clerk, cashier")

    # Check if user with this email already exists
    if User.query.filter_by(email=email.strip()).first():
        abort(409, description="A user with this email already exists.")

    # Note: password should be set by the invited user upon first login/account activation
    # For now, let's create a placeholder or generate a temporary one
    temp_password = "temporary_password_for_invite" # In a real app, use secure password generation and email process
    
    user = User(
        name=name.strip(),
        email=email.strip(),
        _password=User.hash_password(temp_password), # Hash temp password
        role=role,
        store_id=store.id,
        is_active=False, # User needs to activate their account
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.session.add(user)
    db.session.commit()
    
    # In a real application, you would send an email with an activation link here
    # e.g., send_invitation_email(user.email, user.id, temp_password_token)

    return jsonify({"message": f"Invitation sent to {email}. User created with ID {user.id}. (Temporary password for debugging: '{temp_password}')", "user_id": user.id}), 201


# Clerk creates a supply request
@store_bp.route("/<int:store_id>/supply-requests", methods=["POST"])
@jwt_required()
@role_required("clerk", "merchant") # Merchants can also create supply requests for their own stores
def create_supply_request(store_id):
    """
    Creates a new supply request for a store.
    ---
    tags:
      - Supply Requests
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema:
          type: integer
        required: true
        description: The ID of the store making the supply request.
      - in: body
        name: body
        schema:
          type: object
          required:
            - product_id
            - requested_quantity
          properties:
            product_id:
              type: integer
              description: The ID of the product being requested.
              example: 101
            requested_quantity:
              type: integer
              description: The quantity of the product requested.
              example: 50
            notes:
              type: string
              nullable: true
              description: Optional notes for the supply request.
    responses:
      201:
        description: Supply request created successfully.
        schema:
          type: object
          properties:
            id: {type: integer}
            status: {type: string, enum: [pending, approved, declined]}
      400:
        description: Bad request, e.g., missing product ID or quantity.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'clerk'/'merchant' role or access to store.
      404:
        description: Store or Product not found.
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    store = Store.query.get_or_404(store_id, description="Store not found.")

    # Authorization check: Clerk/Merchant must be assigned to or own this store
    check_store_access(store.id, current_user_id, current_user.role)

    data = request.get_json() or {}
    product_id = data.get("product_id")
    quantity = data.get("requested_quantity")
    notes = data.get("notes")

    if not product_id or not quantity:
        abort(400, "Product ID and requested quantity are required.")
    
    try:
        quantity = int(quantity)
        if quantity <= 0:
            abort(400, "Requested quantity must be a positive integer.")
    except ValueError:
        abort(400, "Requested quantity must be an integer.")

    product = Product.query.get_or_404(product_id, description=f"Product with ID {product_id} not found.")

    req = SupplyRequest(
        store_id=store.id,
        product_id=product.id,
        clerk_id=current_user_id, # Clerk/Merchant who initiated the request
        requested_quantity=quantity,
        notes=notes,
        status=SupplyRequestStatus.pending, # New requests are always pending
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"id": req.id, "status": req.status.value, "message": "Supply request created successfully."}), 201

# Admin responds to supply request (approve or decline)
@store_bp.route("/supply-requests/<int:req_id>/respond", methods=["PATCH"]) # Removed store_id from URL
@jwt_required()
@role_required("admin") # Only admin can respond
def respond_supply_request(req_id):
    """
    Responds to a pending supply request (approve or decline).
    ---
    tags:
      - Supply Requests
    security:
      - Bearer: []
    parameters:
      - in: path
        name: req_id
        schema: {type: integer}
        required: true
        description: The ID of the supply request to respond to.
      - in: body
        name: body
        schema:
          type: object
          required:
            - action
          properties:
            action:
              type: string
              enum: [approve, decline]
              description: The action to take on the supply request.
              example: "approve"
            comment:
              type: string
              nullable: true
              description: An optional comment regarding the response.
              example: "Approved, stock available."
    responses:
      200:
        description: Supply request status updated.
        schema:
          type: object
          properties:
            status: {type: string, enum: [pending, approved, declined]}
            request_id: {type: integer}
      400:
        description: Bad request, e.g., invalid action or request already processed.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Supply Request not found.
    """
    admin_id = get_jwt_identity()
    req = SupplyRequest.query.get_or_404(req_id)

    if req.status != SupplyRequestStatus.pending:
        abort(400, f"Request already {req.status.value}.")

    data = request.get_json() or {}
    action = data.get("action")
    comment = data.get("comment", "")

    if action not in ("approve", "decline"):
        abort(400, "Action must be 'approve' or 'decline'.")

    req.admin_id = admin_id
    req.admin_response = comment
    req.updated_at = datetime.now(timezone.utc)

    if action == "approve":
        req.status = SupplyRequestStatus.approved
        # Crucial: Update stock in the store upon approval
        store_product = StoreProduct.query.filter_by(
            store_id=req.store_id,
            product_id=req.product_id
        ).first()

        if store_product:
            store_product.quantity += req.requested_quantity
            store_product.updated_at = datetime.now(timezone.utc)
        else:
            # If product wasn't in store, add it
            new_store_product = StoreProduct(
                store_id=req.store_id,
                product_id=req.product_id,
                quantity=req.requested_quantity,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.session.add(new_store_product)
    else: # action == "decline"
        req.status = SupplyRequestStatus.declined

    db.session.commit()
    return jsonify({"status": req.status.value, "request_id": req.id, "message": f"Supply request {req.status.value}."})


# List all supply requests (Admin, Merchant, Clerk)
@store_bp.route("/supply-requests", methods=["GET"])
@jwt_required()
@role_required("admin", "merchant", "clerk")
def list_supply_requests():
    """
    Lists supply requests with pagination and filtering.
    ---
    tags:
      - Supply Requests
    security:
      - Bearer: []
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
        description: Filter by specific store ID.
      - in: query
        name: product_id
        schema: {type: integer}
        description: Filter by specific product ID.
      - in: query
        name: status
        schema: {type: string, enum: [pending, approved, declined]}
        description: Filter by request status.
      - in: query
        name: start_date
        schema: {type: string, format: date}
        description: Filter requests from this date (YYYY-MM-DD).
      - in: query
        name: end_date
        schema: {type: string, format: date}
        description: Filter requests up to this date (YYYY-MM-DD).
    responses:
      200:
        description: A paginated list of supply requests.
        schema:
          type: object
          properties:
            supply_requests:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  store_name: {type: string}
                  product_name: {type: string}
                  requested_quantity: {type: integer}
                  status: {type: string}
                  clerk_name: {type: string}
                  admin_name: {type: string, nullable: true}
                  admin_response: {type: string, nullable: true}
                  created_at: {type: string, format: date-time}
                  updated_at: {type: string, format: date-time}
            total_pages: {type: integer}
            current_page: {type: integer}
            total_items: {type: integer}
      401: {description: Unauthorized}
      403: {description: Forbidden}
      400: {description: Bad Request}
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    store_id_filter = request.args.get('store_id', type=int)
    product_id_filter = request.args.get('product_id', type=int)
    status_filter = request.args.get('status', type=str)
    start_date_str = request.args.get('start_date', type=str)
    end_date_str = request.args.get('end_date', type=str)

    requests_query = SupplyRequest.query

    # Apply role-based filtering
    if current_user.role == "merchant":
        accessible_store_ids = get_user_accessible_store_ids(current_user_id, current_user.role)
        if not accessible_store_ids:
            return jsonify({'supply_requests': [], 'total_pages': 0, 'current_page': 0, 'total_items': 0}), 200
        requests_query = requests_query.filter(SupplyRequest.store_id.in_(accessible_store_ids))
    elif current_user.role == "clerk":
        user_store_id = current_user.store_id
        if not user_store_id:
            return jsonify({'supply_requests': [], 'total_pages': 0, 'current_page': 0, 'total_items': 0}), 200
        requests_query = requests_query.filter_by(store_id=user_store_id)
        # Clerks typically only see their own requests or requests for their store
        # For now, let's assume all requests for their store
    
    # Apply store_id filter if provided and accessible
    if store_id_filter:
        if current_user.role != "admin": # Admins can filter any store, others must have access
            accessible_store_ids = get_user_accessible_store_ids(current_user_id, current_user.role)
            if store_id_filter not in accessible_store_ids:
                abort(403, description="Forbidden: You do not have access to view supply requests for this store.")
        requests_query = requests_query.filter_by(store_id=store_id_filter)

    if product_id_filter:
        requests_query = requests_query.filter_by(product_id=product_id_filter)

    if status_filter:
        try:
            status_enum = SupplyRequestStatus[status_filter.lower()]
            requests_query = requests_query.filter_by(status=status_enum)
        except KeyError:
            abort(400, "Invalid status provided. Must be 'pending', 'approved', or 'declined'.")

    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            requests_query = requests_query.filter(SupplyRequest.created_at >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            # Filter up to the end of the day
            requests_query = requests_query.filter(SupplyRequest.created_at <= (datetime.combine(end_date, datetime.max.time())).astimezone(timezone.utc))
    except ValueError:
        abort(400, "Invalid date format. Use YYYY-MM-DD.")

    requests_query = requests_query.order_by(SupplyRequest.created_at.desc())

    paginated_requests = requests_query.paginate(page=page, per_page=per_page, error_out=False)

    requests_data = []
    for req in paginated_requests.items:
        requests_data.append({
            'id': req.id,
            'store_id': req.store_id,
            'store_name': req.store.name if req.store else 'N/A',
            'product_id': req.product_id,
            'product_name': req.product.name if req.product else 'N/A',
            'requested_quantity': req.requested_quantity,
            'status': req.status.value,
            'clerk_id': req.clerk_id,
            'clerk_name': req.clerk.name if req.clerk else 'N/A',
            'admin_id': req.admin_id,
            'admin_name': req.admin.name if req.admin else 'N/A',
            'admin_response': req.admin_response,
            'notes': req.notes,
            'created_at': req.created_at.isoformat() if req.created_at else None,
            'updated_at': req.updated_at.isoformat() if req.updated_at else None,
        })

    return jsonify({
        'supply_requests': requests_data,
        'total_pages': paginated_requests.pages,
        'current_page': paginated_requests.page,
        'total_items': paginated_requests.total
    }), 200

# Admin initiates stock transfer
@store_bp.route("/stock-transfers", methods=["POST"])
@jwt_required()
@role_required("admin")
def initiate_transfer():
    """
    Initiates a new stock transfer between stores.
    ---
    tags:
      - Stock Transfers
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - from_store_id
            - to_store_id
            - items
          properties:
            from_store_id:
              type: integer
              description: The ID of the source store.
              example: 1
            to_store_id:
              type: integer
              description: The ID of the destination store.
              example: 2
            notes:
              type: string
              nullable: true
              description: Optional notes for the transfer.
              example: "Urgent transfer for new branch"
            items:
              type: array
              description: A list of products and their quantities to transfer.
              items:
                type: object
                required:
                  - product_id
                  - quantity
                properties:
                  product_id:
                    type: integer
                    description: The ID of the product to transfer.
                    example: 101
                  quantity:
                    type: integer
                    description: The quantity of the product.
                    example: 5
    responses:
      201:
        description: Stock transfer initiated successfully.
        schema:
          type: object
          properties:
            id: {type: integer}
            status: {type: string, enum: [pending, approved, rejected, completed]}
      400:
        description: Bad request, e.g., missing required fields, invalid data, or insufficient stock.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Source or destination store, or product not found.
    """
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    from_store_id = data.get("from_store_id")
    to_store_id = data.get("to_store_id")
    notes = data.get("notes")
    items_data = data.get("items", [])

    if not from_store_id or not to_store_id or not items_data:
        abort(400, "from_store_id, to_store_id, and items are required.")
    
    if from_store_id == to_store_id:
        abort(400, "Source and destination stores cannot be the same.")

    from_store = Store.query.get_or_404(from_store_id, description="Source store not found.")
    to_store = Store.query.get_or_404(to_store_id, description="Destination store not found.")

    # Authorization for stores: Admin can initiate transfers between any stores.
    # No explicit access check needed here since role_required("admin") is present.

    # Check if stores are active and not deleted
    if not from_store.is_active or from_store.is_deleted:
        abort(400, "Source store is inactive or deleted.")
    if not to_store.is_active or to_store.is_deleted:
        abort(400, "Destination store is inactive or deleted.")

    transfer = StockTransfer(
        from_store_id=from_store.id,
        to_store_id=to_store.id,
        initiated_by=admin_id,
        notes=notes,
        status=StockTransferStatus.pending, # All transfers start as pending
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.session.add(transfer)
    db.session.flush() # Get transfer.id

    for item_data in items_data:
        product_id = item_data.get("product_id")
        quantity = item_data.get("quantity")

        if not product_id or not quantity:
            db.session.rollback()
            abort(400, "Each item must have product_id and quantity.")
        
        try:
            quantity = int(quantity)
            if quantity <= 0:
                db.session.rollback()
                abort(400, f"Quantity for product ID {product_id} must be a positive integer.")
        except ValueError:
            db.session.rollback()
            abort(400, f"Invalid quantity type for product ID {product_id}. Must be an integer.")

        product = Product.query.get(product_id)
        if not product:
            db.session.rollback()
            abort(404, f"Product with ID {product_id} not found.")

        # Check if source store has enough stock
        from_store_product = StoreProduct.query.filter_by(
            store_id=from_store.id,
            product_id=product.id
        ).first()

        if not from_store_product or from_store_product.quantity < quantity:
            db.session.rollback()
            abort(400, f"Insufficient stock for product '{product.name}' (ID: {product_id}) in source store.")

        sti = StockTransferItem(
            stock_transfer_id=transfer.id,
            product_id=product.id,
            quantity=quantity
        )
        db.session.add(sti)

    db.session.commit()
    return jsonify({"message": "Stock transfer initiated", "id": transfer.id, "status": transfer.status.value}), 201


# Admin approves stock transfer
@store_bp.route("/stock-transfers/<int:transfer_id>/approve", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def approve_transfer(transfer_id):
    """
    Approves a pending stock transfer and updates stock levels in both stores.
    ---
    tags:
      - Stock Transfers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: transfer_id
        schema: {type: integer}
        required: true
        description: The ID of the stock transfer to approve.
    responses:
      200:
        description: Stock transfer approved and completed.
        schema:
          type: object
          properties:
            status: {type: string, example: "completed"}
            transfer_id: {type: integer}
            message: {type: string}
      400:
        description: Bad request, e.g., transfer already processed or insufficient stock.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Stock Transfer not found.
    """
    admin_id = get_jwt_identity()
    transfer = StockTransfer.query.get_or_404(transfer_id)

    if transfer.status != StockTransferStatus.pending:
        abort(400, f"Transfer already {transfer.status.value}.")
    
    # Check if stores are active and not deleted before completing transfer
    if not transfer.from_store.is_active or transfer.from_store.is_deleted:
        abort(400, "Source store is inactive or deleted, cannot complete transfer.")
    if not transfer.to_store.is_active or transfer.to_store.is_deleted:
        abort(400, "Destination store is inactive or deleted, cannot complete transfer.")

    # Deduct from source store, add to destination store
    for item in transfer.transfer_items:
        from_store_product = StoreProduct.query.filter_by(
            store_id=transfer.from_store_id,
            product_id=item.product_id
        ).first()
        
        if not from_store_product or from_store_product.quantity < item.quantity:
            db.session.rollback() # Rollback if any item causes issues
            abort(400, f"Insufficient stock for product '{item.product.name}' (ID: {item.product_id}) in source store to complete transfer.")
        
        from_store_product.quantity -= item.quantity
        from_store_product.updated_at = datetime.now(timezone.utc)

        to_store_product = StoreProduct.query.filter_by(
            store_id=transfer.to_store_id,
            product_id=item.product_id
        ).first()

        if to_store_product:
            to_store_product.quantity += item.quantity
            to_store_product.updated_at = datetime.now(timezone.utc)
        else:
            new_to_store_product = StoreProduct(
                store_id=transfer.to_store_id,
                product_id=item.product_id,
                quantity=item.quantity,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.session.add(new_to_store_product)

    transfer.status = StockTransferStatus.completed # Change status to completed upon successful stock adjustment
    transfer.approved_by = admin_id
    transfer.transfer_date = datetime.now(timezone.utc) # Date of actual transfer/approval
    transfer.updated_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"message": "Stock transfer approved and completed.", "status": transfer.status.value, "transfer_id": transfer.id}), 200

# Admin rejects stock transfer
@store_bp.route("/stock-transfers/<int:transfer_id>/reject", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def reject_transfer(transfer_id):
    """
    Rejects a pending stock transfer.
    ---
    tags:
      - Stock Transfers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: transfer_id
        schema: {type: integer}
        required: true
        description: The ID of the stock transfer to reject.
      - in: body
        name: body
        schema:
          type: object
          properties:
            comment:
              type: string
              nullable: true
              description: Optional comment for rejection.
    responses:
      200:
        description: Stock transfer rejected.
        schema:
          type: object
          properties:
            status: {type: string, example: "rejected"}
            transfer_id: {type: integer}
            message: {type: string}
      400:
        description: Bad request, e.g., transfer already processed.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Stock Transfer not found.
    """
    admin_id = get_jwt_identity()
    transfer = StockTransfer.query.get_or_404(transfer_id)

    if transfer.status != StockTransferStatus.pending:
        abort(400, f"Transfer already {transfer.status.value}.")

    data = request.get_json() or {}
    comment = data.get("comment")

    transfer.status = StockTransferStatus.rejected
    transfer.approved_by = admin_id # Using approved_by for who acted on it
    transfer.notes = comment # Store rejection reason in notes or add a new field like 'admin_response'
    transfer.updated_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"message": "Stock transfer rejected.", "status": transfer.status.value, "transfer_id": transfer.id}), 200

# List stock transfers with pagination and filters
@store_bp.route("/stock-transfers", methods=["GET"])
@jwt_required()
@role_required("admin", "merchant", "clerk") # Merchant/Clerk can view relevant transfers
def list_stock_transfers():
    """
    Lists stock transfers with pagination and filtering.
    ---
    tags:
      - Stock Transfers
    security:
      - Bearer: []
    parameters:
      - in: query
        name: page
        schema: {type: integer, default: 1}
      - in: query
        name: per_page
        schema: {type: integer, default: 20}
      - in: query
        name: from_store_id
        schema: {type: integer}
        description: Filter by source store ID.
      - in: query
        name: to_store_id
        schema: {type: integer}
        description: Filter by destination store ID.
      - in: query
        name: status
        schema: {type: string, enum: [pending, approved, rejected, completed]}
        description: Filter by transfer status.
      - in: query
        name: start_date
        schema: {type: string, format: date}
        description: Filter transfers initiated from this date (YYYY-MM-DD).
      - in: query
        name: end_date
        schema: {type: string, format: date}
        description: Filter transfers initiated up to this date (YYYY-MM-DD).
      - in: query
        name: product_id
        schema: {type: integer}
        description: Filter by product ID included in the transfer items.
    responses:
      200:
        description: A paginated list of stock transfers.
        schema:
          type: object
          properties:
            stock_transfers:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  from_store_name: {type: string}
                  to_store_name: {type: string}
                  initiated_by_name: {type: string}
                  approved_by_name: {type: string, nullable: true}
                  status: {type: string}
                  transfer_date: {type: string, format: date-time, nullable: true}
                  notes: {type: string, nullable: true}
                  created_at: {type: string, format: date-time}
                  items:
                    type: array
                    items:
                      type: object
                      properties:
                        product_name: {type: string}
                        quantity: {type: integer}
            total_pages: {type: integer}
            current_page: {type: integer}
            total_items: {type: integer}
      401: {description: Unauthorized}
      403: {description: Forbidden}
      400: {description: Bad Request}
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        abort(401, description="User not found.")

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    from_store_id_filter = request.args.get('from_store_id', type=int)
    to_store_id_filter = request.args.get('to_store_id', type=int)
    status_filter = request.args.get('status', type=str)
    start_date_str = request.args.get('start_date', type=str)
    end_date_str = request.args.get('end_date', type=str)
    product_id_filter = request.args.get('product_id', type=int)

    transfers_query = StockTransfer.query

    # Apply role-based filtering
    if current_user.role == "merchant":
        accessible_store_ids = get_user_accessible_store_ids(current_user_id, current_user.role)
        if not accessible_store_ids:
            return jsonify({'stock_transfers': [], 'total_pages': 0, 'current_page': 0, 'total_items': 0}), 200
        # Merchants can only see transfers where their stores are involved (either from or to)
        transfers_query = transfers_query.filter(
            or_(
                StockTransfer.from_store_id.in_(accessible_store_ids),
                StockTransfer.to_store_id.in_(accessible_store_ids)
            )
        )
    elif current_user.role == "clerk":
        user_store_id = current_user.store_id
        if not user_store_id:
            return jsonify({'stock_transfers': [], 'total_pages': 0, 'current_page': 0, 'total_items': 0}), 200
        # Clerks can only see transfers involving their assigned store
        transfers_query = transfers_query.filter(
            or_(
                StockTransfer.from_store_id == user_store_id,
                StockTransfer.to_store_id == user_store_id
            )
        )
    # Admin can see all, no specific filter needed for them here.

    if from_store_id_filter:
        transfers_query = transfers_query.filter_by(from_store_id=from_store_id_filter)
    if to_store_id_filter:
        transfers_query = transfers_query.filter_by(to_store_id=to_store_id_filter)
    
    if status_filter:
        try:
            status_enum = StockTransferStatus[status_filter.lower()]
            transfers_query = transfers_query.filter_by(status=status_enum)
        except KeyError:
            abort(400, "Invalid status provided. Must be 'pending', 'approved', 'rejected', or 'completed'.")

    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            transfers_query = transfers_query.filter(StockTransfer.created_at >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            transfers_query = transfers_query.filter(StockTransfer.created_at <= (datetime.combine(end_date, datetime.max.time())).astimezone(timezone.utc))
    except ValueError:
        abort(400, "Invalid date format. Use YYYY-MM-DD.")

    if product_id_filter:
        transfers_query = transfers_query.join(StockTransferItem).filter(StockTransferItem.product_id == product_id_filter)

    transfers_query = transfers_query.order_by(StockTransfer.created_at.desc())

    paginated_transfers = transfers_query.paginate(page=page, per_page=per_page, error_out=False)

    transfers_data = []
    for transfer in paginated_transfers.items:
        items_data = []
        for item in transfer.transfer_items:
            items_data.append({
                'product_id': item.product_id,
                'product_name': item.product.name if item.product else 'N/A',
                'quantity': item.quantity
            })

        transfers_data.append({
            'id': transfer.id,
            'from_store_id': transfer.from_store_id,
            'from_store_name': transfer.from_store.name if transfer.from_store else 'N/A',
            'to_store_id': transfer.to_store_id,
            'to_store_name': transfer.to_store.name if transfer.to_store else 'N/A',
            'initiated_by': transfer.initiated_by,
            'initiated_by_name': transfer.initiator.name if transfer.initiator else 'N/A',
            'approved_by': transfer.approved_by,
            'approved_by_name': transfer.approver.name if transfer.approver else 'N/A',
            'status': transfer.status.value,
            'transfer_date': transfer.transfer_date.isoformat() if transfer.transfer_date else None,
            'notes': transfer.notes,
            'created_at': transfer.created_at.isoformat() if transfer.created_at else None,
            'updated_at': transfer.updated_at.isoformat() if transfer.updated_at else None,
            'items': items_data
        })

    return jsonify({
        'stock_transfers': transfers_data,
        'total_pages': paginated_transfers.pages,
        'current_page': paginated_transfers.page,
        'total_items': paginated_transfers.total
    }), 200