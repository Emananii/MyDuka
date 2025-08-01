from flask import Blueprint, request, jsonify, abort
from flask_cors import CORS # New import for handling CORS
from sqlalchemy import desc
from sqlalchemy.orm import aliased
from app.models import SupplyRequest, User, Store, Product, SupplyRequestStatus
from app import db
from datetime import datetime, timezone
import functools
import traceback

supply_bp = Blueprint('supply_bp', __name__, url_prefix='/api/supply-requests')

# --- CONFIGURE CORS FOR THIS BLUEPRINT ---
# This line is the critical fix. It allows requests from your frontend's domain.
# CORRECTED: Added "DELETE" to the allowed methods.
CORS(supply_bp, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "PATCH", "DELETE"]}})

# --- MOCK FUNCTIONS FOR DEVELOPMENT ONLY ---
# DO NOT DEPLOY THESE TO PRODUCTION
def mock_jwt_required(fn):
    """A decorator that does nothing for development purposes."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

def mock_get_jwt_identity():
    """Returns a hardcoded user ID for development purposes."""
    # IMPORTANT: Change this to a valid user ID for testing different roles.
    return 1

def mock_role_required(*roles_accepted):
    """A decorator that does nothing for development purposes."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator
# --- END MOCK FUNCTIONS ---


# Helper: serialize supply request
def supply_request_to_dict(req):
    product_data = None
    if req.product:
        product_data = {
            "id": req.product.id,
            "name": req.product.name,
            "unit": req.product.unit
        }

    store_data = None
    if req.store:
        store_data = {
            "id": req.store.id,
            "name": req.store.name
        }

    admin_data = None
    if req.admin:
        admin_data = {
            "id": req.admin.id,
            "email": req.admin.email
        }

    clerk_data = None
    if req.clerk:
        clerk_data = {
            "id": req.clerk.id,
            "email": req.clerk.email
        }

    return {
        "id": req.id,
        "store_id": req.store_id,
        "product_id": req.product_id,
        "requested_quantity": req.requested_quantity,
        "status": req.status.value if isinstance(req.status, SupplyRequestStatus) else req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "product": product_data,
        "store": store_data,
        "admin_response": req.admin_response,
        "admin": admin_data,
        "clerk": clerk_data,
    }

# Route 1: GET all supply requests
@supply_bp.route('/', methods=['GET'])
@mock_jwt_required
@mock_role_required("admin", "merchant")
def get_all_supply_requests():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        status = request.args.get('status')
        store_id = request.args.get('store_id')

        query = SupplyRequest.query

        if status:
            try:
                query = query.filter_by(status=SupplyRequestStatus[status])
            except KeyError:
                return jsonify({"error": f"Invalid status: {status}"}), 400
        if store_id:
            try:
                query = query.filter_by(store_id=int(store_id))
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid store_id"}), 400

        AdminUser = aliased(User)
        ClerkUser = aliased(User)

        query = query.join(Product).join(Store) \
                     .outerjoin(AdminUser, SupplyRequest.admin_id == AdminUser.id) \
                     .outerjoin(ClerkUser, SupplyRequest.clerk_id == ClerkUser.id)

        results = query.order_by(desc(SupplyRequest.created_at)).paginate(page=page, per_page=per_page, error_out=False)
        data = [supply_request_to_dict(req) for req in results.items]

        return jsonify({
            "data": data,
            "page": results.page,
            "total_pages": results.pages,
            "total": results.total
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500


# Route 2: GET a single supply request by ID
@supply_bp.route('/<int:request_id>', methods=['GET'])
@mock_jwt_required
@mock_role_required("admin", "merchant", "clerk")
def get_single_supply_request(request_id):
    req = SupplyRequest.query.get_or_404(request_id)
    return jsonify(supply_request_to_dict(req)), 200


# Route 3: POST new supply request (from clerk)
@supply_bp.route('/', methods=['POST'])
@mock_jwt_required
@mock_role_required("clerk")
def create_supply_request():
    try:
        data = request.get_json()
        product_id = data.get("product_id")
        store_id = data.get("store_id")
        requested_quantity = data.get("requested_quantity")
        clerk_id = mock_get_jwt_identity() # Use the identity from the JWT token

        if not product_id or not store_id or not requested_quantity:
            return jsonify({"error": "Missing required fields: product_id, store_id, requested_quantity"}), 400

        product = Product.query.get(product_id)
        store = Store.query.get(store_id)
        clerk = User.query.get(clerk_id)

        if not product or not store or not clerk:
            return jsonify({"error": "Invalid product_id, store_id, or clerk_id"}), 400

        new_request = SupplyRequest(
            store_id=store_id,
            product_id=product_id,
            requested_quantity=requested_quantity,
            status=SupplyRequestStatus.pending,
            clerk_id=clerk_id
        )
        db.session.add(new_request)
        db.session.commit()

        return jsonify({
            "message": "Supply request submitted",
            "request_id": new_request.id
        }), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500

# Route 4: PATCH to update a supply request (from clerk)
@supply_bp.route('/<int:request_id>', methods=['PATCH'])
@mock_jwt_required
@mock_role_required("clerk")
def update_supply_request(request_id):
    req = SupplyRequest.query.get_or_404(request_id)
    data = request.get_json() or {}

    # Only allow updates to a pending request
    if req.status != SupplyRequestStatus.pending:
        return jsonify({"error": "Only pending requests can be updated."}), 400
        
    # Check if the user is the owner of the request (optional but good practice)
    # if req.clerk_id != mock_get_jwt_identity():
    #     return jsonify({"error": "You do not have permission to update this request."}), 403

    if "product_id" in data:
        req.product_id = data["product_id"]
    if "requested_quantity" in data:
        req.requested_quantity = data["requested_quantity"]
        
    req.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    
    return jsonify({
        "message": f"Supply request {request_id} updated successfully.",
        "id": req.id
    }), 200
    
# NEW Route: DELETE a supply request
@supply_bp.route('/<int:request_id>', methods=['DELETE'])
@mock_jwt_required
@mock_role_required("clerk")
def delete_supply_request(request_id):
    """Deletes a supply request if it's in a 'pending' status."""
    try:
        req = SupplyRequest.query.get_or_404(request_id)

        # SECURITY CHECK: Only allow the owner (clerk) to delete the request.
        # This is a good practice for a real application.
        # if req.clerk_id != mock_get_jwt_identity():
        #     return jsonify({"error": "You do not have permission to delete this request."}), 403
            
        # BUSINESS LOGIC: Only allow deletion of pending requests
        if req.status != SupplyRequestStatus.pending:
            return jsonify({"error": "Only pending requests can be deleted."}), 400

        db.session.delete(req)
        db.session.commit()

        return jsonify({"message": f"Supply request {request_id} deleted successfully."}), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500

# Route 5: PATCH respond to a supply request (admin/merchant)
@supply_bp.route('/<int:request_id>/respond', methods=['PATCH'])
@mock_jwt_required
@mock_role_required("admin", "merchant")
def respond_to_supply_request(request_id):
    data = request.get_json()
    action = data.get("action")
    comment = data.get("comment")
    admin_id = mock_get_jwt_identity() # Use the identity from the JWT token

    req = SupplyRequest.query.get_or_404(request_id)

    if action == "approve":
        req.status = SupplyRequestStatus.approved
    elif action == "decline":
        req.status = SupplyRequestStatus.declined
    else:
        return jsonify({"error": "Invalid action"}), 400

    req.admin_id = admin_id
    req.admin_response = comment
    req.updated_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({
        "message": f"Request {req.status.value}.",
        "request": {
            "id": req.id,
            "status": req.status.value,
            "admin_id": req.admin.id,
            "admin_response": req.admin_response
        }
    }), 200
