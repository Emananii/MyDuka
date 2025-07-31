from flask import Blueprint, request, jsonify
from sqlalchemy import desc
from sqlalchemy.orm import aliased # Import aliased for multiple joins on the same table
from app.models import SupplyRequest, User, Store, Product, SupplyRequestStatus # Added SupplyRequestStatus
from app import db
from datetime import datetime, timezone # Added timezone
import functools # Import functools
import traceback # Import traceback for detailed error logging

supply_bp = Blueprint('supply_bp', __name__, url_prefix='/api/supply-requests')

# --- MOCK FUNCTIONS FOR DEVELOPMENT ONLY ---
# DO NOT DEPLOY THESE TO PRODUCTION
def mock_jwt_required(fn):
    """A decorator that does nothing for development purposes."""
    @functools.wraps(fn) # Use functools.wraps to preserve function metadata
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

def mock_get_jwt_identity():
    """Returns a hardcoded user ID for development purposes.
       Ensure this ID exists in your 'User' table and has the necessary roles
       (e.g., a 'clerk' for supply requests, 'merchant' for store creation, 'admin' for review).
    """
    # IMPORTANT: Change this to an ID that exists in your development database
    # and corresponds to a user with the 'admin' role for testing admin views.
    return 1 # Example: assuming user with ID 1 exists and is an admin for testing

def mock_role_required(*roles_accepted):
    """A decorator that does nothing for development purposes."""
    def decorator(fn):
        @functools.wraps(fn) # Use functools.wraps to preserve function metadata
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator
# --- END MOCK FUNCTIONS ---


# Helper: serialize supply request
def supply_request_to_dict(req):
    # Ensure all relationships are loaded or handled to prevent N/1 queries and ensure data is available
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
            "email": req.admin.email # Changed from 'name' to 'email' - assuming User model has 'email'
        }

    clerk_data = None
    if req.clerk:
        clerk_data = {
            "id": req.clerk.id,
            "email": req.clerk.email # Changed from 'name' to 'email' - assuming User model has 'email'
        }

    return {
        "id": req.id,
        "store_id": req.store_id,
        "product_id": req.product_id,
        "requested_quantity": req.requested_quantity,
        "status": req.status.value if isinstance(req.status, SupplyRequestStatus) else req.status, # Handle Enum
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "product": product_data,
        "store": store_data,
        "admin_response": req.admin_response,
        "admin": admin_data,
        "clerk": clerk_data,
    }

# Route 1: GET all supply requests (filtering, sorting, pagination)
@supply_bp.route('/', methods=['GET'])
# @jwt_required() # Original - Commented out for development testing
# @role_required("admin", "merchant") # Original - Commented out for development testing
@mock_jwt_required # Use mock for development (removed parentheses)
@mock_role_required("admin", "merchant") # Use mock for development (removed parentheses)
def get_all_supply_requests():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        status = request.args.get('status')
        store_id = request.args.get('store_id')

        print(f"--- GET /api/supply-requests/: Received params - page={page}, per_page={per_page}, status={status}, store_id={store_id}")

        query = SupplyRequest.query

        # Diagnostic: Count all requests before any filtering
        total_requests_before_filter = query.count()
        print(f"--- GET /api/supply-requests/: Total requests in DB before filtering: {total_requests_before_filter}")

        if status:
            try:
                query = query.filter_by(status=SupplyRequestStatus[status])
                print(f"--- GET /api/supply-requests/: Applied status filter: {status}")
            except KeyError:
                print(f"--- GET /api/supply-requests/: Invalid status provided: {status}")
                return jsonify({"error": f"Invalid status: {status}"}), 400
        if store_id:
            try:
                query = query.filter_by(store_id=int(store_id))
                print(f"--- GET /api/supply-requests/: Applied store_id filter: {store_id}")
            except (ValueError, TypeError):
                print(f"--- GET /api/supply-requests/: Invalid store_id provided: {store_id}")
                return jsonify({"error": "Invalid store_id"}), 400

        # Eager load relationships to avoid N+1 queries and ensure data is available
        AdminUser = aliased(User)
        ClerkUser = aliased(User)

        query = query.join(Product).join(Store) \
                     .outerjoin(AdminUser, SupplyRequest.admin_id == AdminUser.id) \
                     .outerjoin(ClerkUser, SupplyRequest.clerk_id == ClerkUser.id)

        results = query.order_by(desc(SupplyRequest.created_at)).paginate(page=page, per_page=per_page, error_out=False)
        data = [supply_request_to_dict(req) for req in results.items]

        print(f"--- GET /api/supply-requests/: Fetched {len(data)} supply requests for page {page}. Total after filters: {results.total}")
        if data:
            print(f"--- GET /api/supply-requests/: First item (if any): {data[0]}")

        return jsonify({
            "data": data,
            "page": results.page,
            "total_pages": results.pages,
            "total": results.total
        }), 200
    except Exception as e:
        print(f"--- Error in get_all_supply_requests: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred while fetching supply requests.", "details": str(e)}), 500


# Route 2: GET a single supply request by ID
@supply_bp.route('/<int:request_id>', methods=['GET'])
@mock_jwt_required
@mock_role_required("admin", "merchant", "clerk")
def get_single_supply_request(request_id):
    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Supply request not found"}), 404
    return jsonify(supply_request_to_dict(req)), 200

# Route 3: POST new supply request (from clerk)
@supply_bp.route('/create', methods=['POST'])
def create_supply_request():
    try:
        data = request.get_json()
        print(f"--- POST /api/supply-requests/create: Received data: {data}")

        product_id = data.get("product_id")
        store_id = data.get("store_id")
        requested_quantity = data.get("requested_quantity")
        clerk_id = data.get("clerk_id")

        print(f"--- POST /api/supply-requests/create: Extracted: product_id={product_id}, store_id={store_id}, requested_quantity={requested_quantity}, clerk_id={clerk_id}")

        if not product_id or not store_id or not requested_quantity or not clerk_id:
            print("--- POST /api/supply-requests/create: Validation failed: Missing required fields.")
            return jsonify({"error": "Missing required fields: product_id, store_id, requested_quantity, clerk_id"}), 400

        product = Product.query.get(product_id)
        store = Store.query.get(store_id)
        clerk = User.query.get(clerk_id)

        print(f"--- POST /api/supply-requests/create: FK Validation: product={product}, store={store}, clerk={clerk}")

        if not product or not store or not clerk:
            print("--- POST /api/supply-requests/create: Validation failed: Invalid product_id, store_id, or clerk_id.")
            return jsonify({"error": "Invalid product_id, store_id, or clerk_id"}), 400

        new_request = SupplyRequest(
            store_id=store_id,
            product_id=product_id,
            requested_quantity=requested_quantity,
            status=SupplyRequestStatus.pending,
            clerk_id=clerk_id
        )
        db.session.add(new_request)
        print("--- POST /api/supply-requests/create: Added new_request to session.")
        db.session.commit()
        print("--- POST /api/supply-requests/create: Database commit successful.")

        status_value = new_request.status.value if isinstance(new_request.status, SupplyRequestStatus) else str(new_request.status)
        print(f"--- POST /api/supply-requests/create: New supply request created: ID={new_request.id}, Status={status_value}, Type of status: {type(new_request.status)}")
        print(f"--- POST /api/supply-requests/create: New request's store_id: {new_request.store_id}")


        return jsonify({
            "message": "Supply request submitted",
            "request_id": new_request.id
        }), 201
    except Exception as e:
        print(f"--- Error in create_supply_request: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred while creating supply request.", "details": str(e)}), 500


# Route 4: PATCH respond to a supply request (admin/merchant)
@supply_bp.route('/<int:request_id>/respond', methods=['PATCH'])
@mock_jwt_required
@mock_role_required("admin", "merchant")
def respond_to_supply_request(request_id):
    data = request.get_json()
    action = data.get("action")
    comment = data.get("comment")
    admin_id = data.get("admin_id")

    if not admin_id:
        return jsonify({"error": "Missing admin_id in request"}), 400

    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Supply request not found"}), 404

    admin = User.query.get(admin_id)
    if not admin:
        return jsonify({"error": "Invalid admin_id"}), 400

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

    print(f"Supply request {req.id} updated to status: {req.status.value}")

    return jsonify({
        "message": f"Request {req.status.value}.",
        "request": {
            "id": req.id,
            "status": req.status.value,
            "admin_id": req.admin_id,
            "admin_response": req.admin_response
        }
    }), 200
from flask import Blueprint, request, jsonify
from sqlalchemy import desc
from sqlalchemy.orm import aliased # Import aliased for multiple joins on the same table
from app.models import SupplyRequest, User, Store, Product, SupplyRequestStatus # Added SupplyRequestStatus
from app import db
from datetime import datetime, timezone # Added timezone
import functools # Import functools
import traceback # Import traceback for detailed error logging

supply_bp = Blueprint('supply_bp', __name__, url_prefix='/api/supply-requests')

# --- MOCK FUNCTIONS FOR DEVELOPMENT ONLY ---
# DO NOT DEPLOY THESE TO PRODUCTION
def mock_jwt_required(fn):
    """A decorator that does nothing for development purposes."""
    @functools.wraps(fn) # Use functools.wraps to preserve function metadata
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

def mock_get_jwt_identity():
    """Returns a hardcoded user ID for development purposes.
       Ensure this ID exists in your 'User' table and has the necessary roles
       (e.g., a 'clerk' for supply requests, 'merchant' for store creation, 'admin' for review).
    """
    # IMPORTANT: Changed to 3, assuming user with ID 3 is an admin for store_id 2.
    # You MUST ensure user ID 3 in your DB has role 'admin' and store_id '2'.
    # If user ID 3 is not associated with store_id 2 in your DB, you need to:
    # 1. Update your seed data to reflect this, OR
    # 2. Manually update user ID 3's store_id to 2 in your database.
    return 3

def mock_role_required(*roles_accepted):
    """A decorator that does nothing for development purposes."""
    def decorator(fn):
        @functools.wraps(fn) # Use functools.wraps to preserve function metadata
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator
# --- END MOCKS ---


# Helper: serialize supply request
def supply_request_to_dict(req):
    # Ensure all relationships are loaded or handled to prevent N/1 queries and ensure data is available
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
            "email": req.admin.email # Changed from 'name' to 'email' - assuming User model has 'email'
        }

    clerk_data = None
    if req.clerk:
        clerk_data = {
            "id": req.clerk.id,
            "email": req.clerk.email # Changed from 'name' to 'email' - assuming User model has 'email'
        }

    return {
        "id": req.id,
        "store_id": req.store_id,
        "product_id": req.product_id,
        "requested_quantity": req.requested_quantity,
        "status": req.status.value if isinstance(req.status, SupplyRequestStatus) else req.status, # Handle Enum
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "product": product_data,
        "store": store_data,
        "admin_response": req.admin_response,
        "admin": admin_data,
        "clerk": clerk_data,
    }

# Route 1: GET all supply requests (filtering, sorting, pagination)
@supply_bp.route('/', methods=['GET'])
# @jwt_required() # Original - Commented out for development testing
# @role_required("admin", "merchant") # Original - Commented out for development testing
@mock_jwt_required # Use mock for development (removed parentheses)
@mock_role_required("admin", "merchant") # Use mock for development (removed parentheses)
def get_all_supply_requests():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        status = request.args.get('status')
        store_id = request.args.get('store_id')

        print(f"--- GET /api/supply-requests/: Received params - page={page}, per_page={per_page}, status={status}, store_id={store_id}")

        query = SupplyRequest.query

        # Diagnostic: Count all requests before any filtering
        total_requests_before_filter = query.count()
        print(f"--- GET /api/supply-requests/: Total requests in DB before filtering: {total_requests_before_filter}")

        if status:
            try:
                query = query.filter_by(status=SupplyRequestStatus[status])
                print(f"--- GET /api/supply-requests/: Applied status filter: {status}")
            except KeyError:
                print(f"--- GET /api/supply-requests/: Invalid status provided: {status}")
                return jsonify({"error": f"Invalid status: {status}"}), 400
        if store_id:
            try:
                query = query.filter_by(store_id=int(store_id))
                print(f"--- GET /api/supply-requests/: Applied store_id filter: {store_id}")
            except (ValueError, TypeError):
                print(f"--- GET /api/supply-requests/: Invalid store_id provided: {store_id}")
                return jsonify({"error": "Invalid store_id"}), 400

        # Eager load relationships to avoid N+1 queries and ensure data is available
        AdminUser = aliased(User)
        ClerkUser = aliased(User)

        query = query.join(Product).join(Store) \
                     .outerjoin(AdminUser, SupplyRequest.admin_id == AdminUser.id) \
                     .outerjoin(ClerkUser, SupplyRequest.clerk_id == ClerkUser.id)

        results = query.order_by(desc(SupplyRequest.created_at)).paginate(page=page, per_page=per_page, error_out=False)
        data = [supply_request_to_dict(req) for req in results.items]

        print(f"--- GET /api/supply-requests/: Fetched {len(data)} supply requests for page {page}. Total after filters: {results.total}")
        if data:
            print(f"--- GET /api/supply-requests/: First item (if any): {data[0]}")

        return jsonify({
            "data": data,
            "page": results.page,
            "total_pages": results.pages,
            "total": results.total
        }), 200
    except Exception as e:
        print(f"--- Error in get_all_supply_requests: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred while fetching supply requests.", "details": str(e)}), 500


# Route 2: GET a single supply request by ID
@supply_bp.route('/<int:request_id>', methods=['GET'])
@mock_jwt_required
@mock_role_required("admin", "merchant", "clerk")
def get_single_supply_request(request_id):
    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Supply request not found"}), 404
    return jsonify(supply_request_to_dict(req)), 200

# Route 3: POST new supply request (from clerk)
@supply_bp.route('/create', methods=['POST'])
def create_supply_request():
    try:
        data = request.get_json()
        print(f"--- POST /api/supply-requests/create: Received data: {data}")

        product_id = data.get("product_id")
        store_id = data.get("store_id")
        requested_quantity = data.get("requested_quantity")
        clerk_id = data.get("clerk_id")

        print(f"--- POST /api/supply-requests/create: Extracted: product_id={product_id}, store_id={store_id}, requested_quantity={requested_quantity}, clerk_id={clerk_id}")

        if not product_id or not store_id or not requested_quantity or not clerk_id:
            print("--- POST /api/supply-requests/create: Validation failed: Missing required fields.")
            return jsonify({"error": "Missing required fields: product_id, store_id, requested_quantity, clerk_id"}), 400

        product = Product.query.get(product_id)
        store = Store.query.get(store_id)
        clerk = User.query.get(clerk_id)

        print(f"--- POST /api/supply-requests/create: FK Validation: product={product}, store={store}, clerk={clerk}")

        if not product or not store or not clerk:
            print("--- POST /api/supply-requests/create: Validation failed: Invalid product_id, store_id, or clerk_id.")
            return jsonify({"error": "Invalid product_id, store_id, or clerk_id"}), 400

        new_request = SupplyRequest(
            store_id=store_id,
            product_id=product_id,
            requested_quantity=requested_quantity,
            status=SupplyRequestStatus.pending,
            clerk_id=clerk_id
        )
        db.session.add(new_request)
        print("--- POST /api/supply-requests/create: Added new_request to session.")
        db.session.commit()
        print("--- POST /api/supply-requests/create: Database commit successful.")

        status_value = new_request.status.value if isinstance(new_request.status, SupplyRequestStatus) else str(new_request.status)
        print(f"--- POST /api/supply-requests/create: New supply request created: ID={new_request.id}, Status={status_value}, Type of status: {type(new_request.status)}")
        print(f"--- POST /api/supply-requests/create: New request's store_id: {new_request.store_id}")


        return jsonify({
            "message": "Supply request submitted",
            "request_id": new_request.id
        }), 201
    except Exception as e:
        print(f"--- Error in create_supply_request: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred while creating supply request.", "details": str(e)}), 500


# Route 4: PATCH respond to a supply request (admin/merchant)
@supply_bp.route('/<int:request_id>/respond', methods=['PATCH'])
@mock_jwt_required
@mock_role_required("admin", "merchant")
def respond_to_supply_request(request_id):
    data = request.get_json()
    action = data.get("action")
    comment = data.get("comment")
    admin_id = data.get("admin_id")

    if not admin_id:
        return jsonify({"error": "Missing admin_id in request"}), 400

    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Supply request not found"}), 404

    admin = User.query.get(admin_id)
    if not admin:
        return jsonify({"error": "Invalid admin_id"}), 400

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

    print(f"Supply request {req.id} updated to status: {req.status.value}")

    return jsonify({
        "message": f"Request {req.status.value}.",
        "request": {
            "id": req.id,
            "status": req.status.value,
            "admin_id": req.admin_id,
            "admin_response": req.admin_response
        }
    }), 200
# ```

# ---

# ### Actionable Steps:

# 1.  **Update `supply_routes.py`:** Replace the content of your `supply_routes.py` file with the code from the Canvas above. The key change is `return 3` in `mock_get_jwt_identity()`.
# 2.  **Verify Database User Association:**
#     * **Crucially, ensure that User ID 3 in your database has the `admin` role and is associated with `store_id = 2`.** If User ID 3 is currently associated with `store_id = 1`, you will need to update this in your database (e.g., via a SQL command, a seed script modification, or a Flask shell).
# 3.  **Restart your Flask server.**
# 4.  **Create a new supply request from the clerk page.** (This will still go to store ID 2, as the clerk's context determines that).
# 5.  **Navigate to your admin page.**

# After these steps, your admin page should now be fetching requests for Store ID 2 (because `mock_get_jwt_identity()` is returning 3, and we're assuming user 3 is linked to store 2), and thus should display the newly created supply requests.

# Let me know if you're able to confirm the database association for user ID