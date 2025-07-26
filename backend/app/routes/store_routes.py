from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone # Use timezone.utc for datetime.utcnow() replacement
from app import db
from app.models import (
    Store, StoreProduct, SupplyRequest, StockTransfer,
    StockTransferItem, Product, User,
    SupplyRequestStatus, StockTransferStatus
)
from app.routes.auth_routes import role_required

store_bp = Blueprint("store", __name__, url_prefix="/api/store")

# Create a new store (Merchant only)
@store_bp.route("/store/create", methods=["POST"])
@jwt_required()
@role_required("merchant")
def create_store():
    data = request.get_json() or {}
    name = data.get("name")
    address = data.get("address")

    if not name or not isinstance(name, str):
        abort(400, description="Store name is required and must be a string.")

    user_id = get_jwt_identity()
    store = Store(name=name.strip(), address=data.get("address"))
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
    responses:
      201:
        description: Store created successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              description: The ID of the newly created store.
            name:
              type: string
              description: The name of the new store.
      400:
        description: Bad request, e.g., missing store name.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' role.
    """
    data = request.get_json()
    if not data.get("name"):
        abort(400, "Store name required")
    store = Store(name=data["name"], address=data.get("address"))
    db.session.add(store)
    db.session.commit()
    return jsonify({"id": store.id, "name": store.name}), 201

# Update store
@store_bp.route("/<int:store_id>", methods=["PATCH"])
@jwt_required()
@role_required("merchant")
def update_store(store_id):
    """
    Update an existing store's information.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema:
          type: integer
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
    responses:
      200:
        description: Store updated successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Store updated"
      400:
        description: Bad request, e.g., invalid data format.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' role.
      404:
        description: Store not found.
    """
    store = Store.query.get_or_404(store_id)
    data = request.get_json() or {}

    if "name" in data:
        store.name = data["name"]
    if "address" in data:
        store.address = data["address"]

    db.session.commit()
    return jsonify({"message": "Store updated", "id": store.id})

# Soft delete a store
@store_bp.route("/<int:store_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant")
def delete_store(store_id):
    """
    Soft-deletes a store.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    parameters:
      - in: path
        name: store_id
        schema:
          type: integer
        required: true
        description: The ID of the store to soft-delete.
    responses:
      200:
        description: Store soft-deleted successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Store soft-deleted"
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' role.
      404:
        description: Store not found.
    """
    store = Store.query.get_or_404(store_id)
    store.is_deleted = True
    db.session.commit()
    return jsonify({"message": "Store soft-deleted", "id": store.id})

# List all stores
@store_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin")
def list_stores():
    """
    Lists all active (not soft-deleted) stores.
    ---
    tags:
      - Stores
    security:
      - Bearer: []
    responses:
      200:
        description: A list of active stores.
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                description: The ID of the store.
              name:
                type: string
                description: The name of the store.
              address:
                type: string
                description: The address of the store.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' or 'admin' role.
    """
    stores = Store.query.filter_by(is_deleted=False).all()
    return jsonify([
        {"id": s.id, "name": s.name, "address": s.address}
        for s in stores
    ])

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
              enum: [admin, clerk, cashier]
              description: The role to assign to the invited user within the store.
              example: "clerk"
    responses:
      202:
        description: Invitation sent successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Invitation sent to newuser@example.com"
      400:
        description: Bad request, e.g., missing email/role or invalid role.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'merchant' or 'admin' role.
      404:
        description: Store not found.
    """
    store = Store.query.get_or_404(store_id)
    data = request.get_json() or {}

    email = data.get("email")
    role = data.get("role")

    if not email or not role:
        abort(400, "Both email and role are required.")
    if role not in ("admin", "clerk", "cashier"):
        abort(400, "Role must be one of: admin, clerk, cashier")

    user = User(email=email.strip(), role=role, store_id=store.id, is_active=False)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": f"Invitation sent to {email}", "user_id": user.id}), 202

# Update store details (Merchant only)
@store_bp.route("/<int:store_id>", methods=["PUT"])
@jwt_required()
@role_required("merchant")
def update_store_details(store_id):
    data = request.get_json() or {}
    name = data.get("name")
    address = data.get("address")

    user_id = get_jwt_identity()
    store = Store.query.filter_by(id=store_id, merchant_id=user_id).first()

    if not store or not store.is_active:
        abort(404, description="Store not found")

    if name:
        store.name = name.strip()
    if address:
        store.address = address.strip()

    db.session.commit()

    return jsonify({"message": "Store updated", "store": store.to_dict()}), 200

# Deactivate store (Merchant only)
@store_bp.route("/<int:store_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant")
def deactivate_store(store_id):
    user_id = get_jwt_identity()
    store = Store.query.filter_by(id=store_id, merchant_id=user_id).first()

    if not store or not store.is_active:
        abort(404, description="Store not found or already inactive")

    store.is_active = False
    db.session.commit()

    return jsonify({"message": "Store deactivated"}), 200

# Clerk creates a supply request
@store_bp.route("/<int:store_id>/supply-requests", methods=["POST"])
@jwt_required()
@role_required("clerk")
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
    responses:
      201:
        description: Supply request created successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              description: The ID of the created supply request.
            status:
              type: string
              enum: [pending, approved, declined]
              description: The initial status of the supply request (always 'pending').
      400:
        description: Bad request, e.g., missing product ID or quantity.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'clerk' role.
      404:
        description: Store or Product not found.
    """
    store = Store.query.get_or_404(store_id)
    data = request.get_json() or {}

    product_id = data.get("product_id")
    quantity = data.get("requested_quantity")

    if not product_id or not quantity:
        abort(400, "Product ID and requested quantity are required.")

    product = Product.query.get_or_404(product_id)
    req = SupplyRequest(
        store=store,
        product=product,
        clerk_id=get_jwt_identity(),
        requested_quantity=quantity
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"id": req.id, "status": req.status.value}), 201

# Admin responds to supply request
@store_bp.route("/<int:store_id>/supply-requests/<int:req_id>/respond", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def respond_supply_request(store_id, req_id):
    """
    Responds to a pending supply request (approve or decline).
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
        description: The ID of the store associated with the supply request.
      - in: path
        name: req_id
        schema:
          type: integer
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
            status:
              type: string
              enum: [pending, approved, declined]
              description: The new status of the supply request.
      400:
        description: Bad request, e.g., invalid action or request already processed.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Store or Supply Request not found.
    """
    req = SupplyRequest.query.filter_by(store_id=store_id, id=req_id).first_or_404()
    data = request.get_json() or {}

    action = data.get("action")
    comment = data.get("comment", "")

    if action not in ("approve", "decline"):
        abort(400, "Action must be 'approve' or 'decline'.")

    req.status = SupplyRequestStatus.approved if action == "approve" else SupplyRequestStatus.declined
    req.admin_id = get_jwt_identity()
    req.admin_response = comment
    req.updated_at = datetime.utcnow()

    req.admin_response = data.get("comment")
    req.updated_at = datetime.now(timezone.utc) # Use timezone-aware datetime
    db.session.commit()
    return jsonify({"status": req.status.value, "request_id": req.id})

# Admin initiates stock transfer
@store_bp.route("/stock-transfers", methods=["POST"])
@jwt_required()
@role_required("admin")
def initiate_transfer():
    data = request.get_json() or {}
    items = data.get("items", [])

    if not data.get("from_store_id") or not data.get("to_store_id") or not items:
        abort(400, "from_store_id, to_store_id, and items are required.")

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
            id:
              type: integer
              description: The ID of the initiated stock transfer.
            status:
              type: string
              enum: [pending, approved, rejected, completed]
              description: The initial status of the stock transfer (always 'pending').
      400:
        description: Bad request, e.g., missing required fields or invalid data.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Source or destination store, or product not found.
    """
    data = request.get_json()
    transfer = StockTransfer(
        from_store_id=data["from_store_id"],
        to_store_id=data["to_store_id"],
        initiated_by=get_jwt_identity(),
        notes=data.get("notes")
    )
    db.session.add(transfer)
    db.session.flush()

    for item in items:
        if not item.get("product_id") or not item.get("quantity"):
            abort(400, "Each item must have product_id and quantity.")
        sti = StockTransferItem(
            stock_transfer_id=transfer.id,
            product_id=item["product_id"],
            quantity=item["quantity"]
        )
        db.session.add(sti)

    db.session.commit()
    return jsonify({"id": transfer.id, "status": transfer.status.value}), 201

# Admin approves stock transfer
@store_bp.route("/stock-transfers/<int:transfer_id>/approve", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def approve_transfer(transfer_id):
    """
    Approves a pending stock transfer.
    ---
    tags:
      - Stock Transfers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: transfer_id
        schema:
          type: integer
        required: true
        description: The ID of the stock transfer to approve.
    responses:
      200:
        description: Stock transfer approved successfully.
        schema:
          type: object
          properties:
            status:
              type: string
              example: "approved"
      400:
        description: Bad request, e.g., transfer already processed.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      403:
        description: Forbidden, user does not have 'admin' role.
      404:
        description: Stock Transfer not found.
    """
    transfer = StockTransfer.query.get_or_404(transfer_id)

    if transfer.status != StockTransferStatus.pending:
        abort(400, "Transfer already processed.")

    transfer.status = StockTransferStatus.approved
    transfer.approved_by = get_jwt_identity()
    transfer.transfer_date = datetime.utcnow()

    db.session.commit()
    return jsonify({"status": "approved", "transfer_id": transfer.id})
