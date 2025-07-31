from flask import Blueprint, request, jsonify, abort
from datetime import datetime, timezone  # Use timezone.utc for datetime.utcnow() replacement
from app import db
from app.models import User, Store  # Import Store model
from app.services.user_services import can_deactivate_user, can_delete_user  # Import the service functions
from app.routes.auth_routes import EMAIL_REGEX  # Import EMAIL_REGEX (role_required will be removed)
from sqlalchemy import func  # Import func for lower()
from http import HTTPStatus

# Renamed the blueprint instance to 'users_api_bp' and its internal name to 'users_api'
users_api_bp = Blueprint("users_api", __name__, url_prefix="/api/users")

# --- DEBUGGING HELPER: TEMPORARY USER INFO (REMOVE IN PRODUCTION) ---
# This function provides a dummy user_id and role for testing purposes when JWT is disabled.
# In a real application, this would be replaced by actual JWT token parsing or session management.
def get_debug_user_info():
    # For testing, let's assume a default admin user with ID 1.
    # You might need to adjust this ID based on your seeded data.
    debug_user_id = 1
    debug_user = User.query.get(debug_user_id)
    if debug_user:
        return debug_user.id, debug_user.role
    # Fallback if even the debug user doesn't exist (e.g., empty DB)
    # This scenario should ideally be prevented by proper seeding.
    # For now, raise an error or return a default that will cause subsequent checks to fail.
    # A more robust solution might involve creating a temporary user here if none exists.
    abort(500, description="Debug user (ID 1) not found. Please seed your database or configure a valid debug user.")

# Helper to serialize user (if you don't have Marshmallow schemas set yet)
def serialize_user(user):
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "store_id": user.store_id,
        "created_by": user.created_by,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "is_deleted": user.is_deleted
    }

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


# --- GET All Users (for Merchant/Admin to view) ---
@users_api_bp.route("/", methods=["GET"])
# @jwt_required() # REMOVED
# @role_required("merchant", "admin") # REMOVED
def get_all_users():
    """
    Lists all users with pagination and filtering.
    ---
    tags:
      - Users
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
        description: Search by user name or email.
      - in: query
        name: role
        schema: {type: string, enum: [merchant, admin, clerk, cashier]}
        description: Filter by user role.
      - in: query
        name: status
        schema: {type: string, enum: [active, inactive]}
        description: Filter by active status ('active' or 'inactive').
      - in: query
        name: store_id
        schema: {type: integer}
        description: Filter by assigned store ID.
      - in: query
        name: is_deleted
        schema: {type: boolean}
        description: Filter by deleted status (true/false). Admins typically see deleted.
    responses:
      200:
        description: A paginated list of users.
        schema:
          type: object
          properties:
            users:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  name: {type: string}
                  email: {type: string}
                  role: {type: string}
                  is_active: {type: boolean}
                  store_id: {type: integer, nullable: true}
                  store_name: {type: string, nullable: true}
                  created_at: {type: string, format: date-time}
                  updated_at: {type: string, format: date-time}
                  is_deleted: {type: boolean}
            total_pages: {type: integer}
            current_page: {type: integer}
            total_items: {type: integer}
      403: {description: Forbidden, user does not have permission.}
      400: {description: Bad Request}
    """
    current_user_id, current_user_role = get_debug_user_info() # Get debug user info
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    # Manual role check for this endpoint (since @role_required is removed)
    if current_user_role not in ["merchant", "admin"]:
        abort(403, description="Forbidden: Only merchants and admins can view all users.")

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_query = request.args.get('search', type=str)
    role_filter = request.args.get('role', type=str)
    status_filter = request.args.get('status', type=str) # 'active' or 'inactive'
    store_id_filter = request.args.get('store_id', type=int)
    is_deleted_filter = request.args.get('is_deleted', type=str) # 'true'/'false' string

    users_query = User.query

    # Apply role-based filtering for merchants
    if current_user_role == "merchant":
        # Merchants can only see users they have created or users associated with their stores
        # For simplicity, let's assume merchants can see all non-merchant users
        # in their own stores or users they directly manage.
        # A more complex rule might involve checking `created_by` or `store_id` relations.
        # For now, let's filter by non-merchant roles, and if store_id is present, filter by it.
        users_query = users_query.filter(User.role != "merchant")
    
    # Admins can see all users, no explicit initial filter here for them.

    if search_query:
        users_query = users_query.filter(
            (User.name.ilike(f'%{search_query}%')) |
            (User.email.ilike(f'%{search_query}%'))
        )
    if role_filter:
        users_query = users_query.filter_by(role=role_filter)
    
    if status_filter is not None:
        if status_filter.lower() == 'active':
            users_query = users_query.filter_by(is_active=True)
        elif status_filter.lower() == 'inactive':
            users_query = users_query.filter_by(is_active=False)
        else:
            abort(400, "Invalid value for 'status'. Must be 'active' or 'inactive'.")
    
    if store_id_filter:
        # If a store_id filter is provided, ensure the current user has access to that store
        check_store_access(store_id_filter, current_user_id, current_user_role)
        users_query = users_query.filter_by(store_id=store_id_filter)
    elif current_user_role == "admin" and current_user.store_id:
        # If admin, and no store_id filter is provided, default to their own store
        users_query = users_query.filter_by(store_id=current_user.store_id)


    if is_deleted_filter is not None:
        if current_user_role == "admin": # Only admins can see deleted users
            if is_deleted_filter.lower() == 'true':
                users_query = users_query.filter_by(is_deleted=True)
            elif is_deleted_filter.lower() == 'false':
                users_query = users_query.filter_by(is_deleted=False)
            else:
                abort(400, "Invalid value for 'is_deleted'. Must be 'true' or 'false'.")
        else: # Non-admins can only see non-deleted users
            users_query = users_query.filter_by(is_deleted=False)
    else: # Default behavior: only show non-deleted users if filter not specified
        users_query = users_query.filter_by(is_deleted=False)

    users_query = users_query.order_by(User.name) # Order for consistent pagination

    paginated_users = users_query.paginate(page=page, per_page=per_page, error_out=False)

    users_data = []
    for user in paginated_users.items:
        users_data.append({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'store_id': user.store_id,
            'store_name': user.store.name if user.store else 'N/A', # Access store relationship
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'updated_at': user.updated_at.isoformat() if user.updated_at else None,
            'is_deleted': user.is_deleted
        })
    return jsonify({
        'users': users_data,
        'total_pages': paginated_users.pages,
        'current_page': paginated_users.page,
        'total_items': paginated_users.total
    }), HTTPStatus.OK

# --- GET Users by Store ID (for Store Admin to view users in their store) ---
@users_api_bp.route("/stores/<int:store_id>/users", methods=["GET"])
# @jwt_required() # REMOVED
# @role_required("admin") # REMOVED
def get_users_by_store(store_id):
    """
    Retrieves users associated with a specific store, accessible by admins of that store.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: store_id
        schema: {type: integer}
        required: true
        description: The ID of the store to retrieve users from.
    responses:
      200:
        description: A list of users in the specified store.
        schema:
          type: array
          items:
            type: object
            properties:
              id: {type: integer}
              name: {type: string}
              email: {type: string}
              role: {type: string}
              is_active: {type: boolean}
              store_id: {type: integer, nullable: true}
      403: {description: Forbidden, user does not have access to this store or role is not admin.}
      404: {description: Store not found.}
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    # Manual role and store access check
    if current_user_role != 'admin':
        abort(403, description="Forbidden: Only admins can access this endpoint.")
    
    if not current_user.store_id or current_user.store_id != store_id:
        abort(403, description="Forbidden: Admin can only view users for their assigned store.")

    store = Store.query.get_or_404(store_id) # Ensure store exists

    allowed_roles_for_admin_view = ['cashier', 'clerk']
    users_in_store = User.query.filter(
        User.store_id == store_id,
        User.role.in_(allowed_roles_for_admin_view),
        User.is_deleted == False # Only show non-deleted users
    ).all()

    return jsonify([serialize_user(user) for user in users_in_store]), HTTPStatus.OK


# --- GET User by ID (for editing) ---
@users_api_bp.route("/<int:user_id>", methods=["GET"])
# @jwt_required() # REMOVED
# @role_required("merchant", "admin") # REMOVED
def get_user_by_id(user_id):
    """
    Retrieves details of a specific user by ID.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        schema: {type: integer}
        required: true
        description: The ID of the user to retrieve.
    responses:
      200:
        description: User details.
        schema:
          type: object
          properties:
            id: {type: integer}
            name: {type: string}
            email: {type: string}
            role: {type: string}
            is_active: {type: boolean}
            store_id: {type: integer, nullable: true}
            created_by: {type: integer, nullable: true}
            created_at: {type: string, format: date-time}
            updated_at: {type: string, format: date-time}
            is_deleted: {type: boolean}
      403: {description: Forbidden, user does not have permission.}
      404: {description: User not found.}
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    user = User.query.get(user_id)
    if not user:
        abort(HTTPStatus.NOT_FOUND, description="User not found.")

    # Manual authorization check
    if current_user_role == "merchant":
        # Merchant can view any non-merchant user
        if user.role == "merchant" and user.id != current_user_id: # Merchant can view their own profile
            abort(403, description="Forbidden: Merchant cannot view other merchant's profiles.")
    elif current_user_role == "admin":
        # Admin can view users in their own store
        if not current_user.store_id or user.store_id != current_user.store_id:
            abort(403, description="Forbidden: Admin can only view users in their assigned store.")
    else: # Clerks/Cashiers should not use this endpoint to view arbitrary users
        abort(403, description="Forbidden: Your role does not allow viewing arbitrary user profiles.")
    
    return jsonify(serialize_user(user)), HTTPStatus.OK


# --- CREATE User ---
@users_api_bp.route("/", methods=["POST"]) # Changed route from /create for RESTfulness
# @jwt_required() # REMOVED
# @role_required("merchant", "admin", "clerk") # REMOVED
def create_user():
    """
    Creates a new user account.
    ---
    tags:
      - Users
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - name
            - email
            - password
            - role
          properties:
            name: {type: string}
            email: {type: string, format: email}
            password: {type: string}
            role: {type: string, enum: [admin, clerk, cashier]} # Merchant role cannot be created this way
            store_id: {type: integer, nullable: true}
    responses:
      201:
        description: User created successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            user: {type: object}
      400: {description: Bad request, e.g., missing data, invalid format.}
      403: {description: Forbidden, user does not have permission to create this role or for this store.}
      409: {description: Conflict, email already exists.}
      404: {description: Store not found if store_id provided.}
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    requested_role = data.get("role")
    store_id = data.get("store_id")

    if not all([name, email, password, requested_role]):
        abort(HTTPStatus.BAD_REQUEST, description="Missing name, email, password, or role.")

    if not EMAIL_REGEX.match(email):
        abort(HTTPStatus.BAD_REQUEST, description="Invalid email format.")

    if User.query.filter(func.lower(User.email) == func.lower(email)).first():
        abort(HTTPStatus.CONFLICT, description="Email already exists.")

    allowed_roles_to_create = {
        "merchant": ["admin", "cashier", "clerk"],
        "admin": ["cashier", "clerk"],
        "clerk": ["cashier"],
    }

    if requested_role not in allowed_roles_to_create.get(current_user_role, []):
        abort(HTTPStatus.FORBIDDEN, description=f"Your role ({current_user_role}) is not allowed to create '{requested_role}' users.")

    final_store_id = None

    if current_user_role == "merchant":
        if requested_role == "admin":
            if not store_id:
                abort(HTTPStatus.BAD_REQUEST, description="Store ID is required when creating an Admin.")
            store = Store.query.get(store_id)
            if not store:
                abort(HTTPStatus.NOT_FOUND, description="Invalid Store ID provided.")
            if store.merchant_id != current_user_id: # Assuming merchant_id is on Store model
                abort(HTTPStatus.FORBIDDEN, description="Merchant can only create admins for their own stores.")
            final_store_id = store_id
        elif requested_role in ["clerk", "cashier"]: # Added: Merchant creating Clerk/Cashier
            # For clerks/cashiers, the store_id can be null or a specific store.
            # Validate if a store_id is provided and exists.
            if store_id is not None:
                store = Store.query.get(store_id)
                if not store:
                    abort(HTTPStatus.NOT_FOUND, description="Invalid Store ID provided.")
                # Optional: Add logic to ensure merchant has control over this store if desired
                # e.g., if store.merchant_id != current_user_id: abort(...)
            final_store_id = store_id # Use the store_id sent from the frontend
        # No 'else' here, if a merchant tries to create something else, it's caught by allowed_roles_to_create above.

    elif current_user_role in ["admin", "clerk"]:
        if not current_user.store_id:
            abort(HTTPStatus.FORBIDDEN, description=f"Your account is not assigned to a store. Cannot create users.")
        if store_id and store_id != current_user.store_id:
            abort(HTTPStatus.FORBIDDEN, description=f"{current_user_role.capitalize()} can only create users for their assigned store.")
        final_store_id = current_user.store_id # Force new user to be in the current user's store

    # It's good practice to ensure final_store_id is set for roles that require it (e.g., non-merchant)
    # If a clerk/cashier *must* have a store_id, you can add this check:
    if requested_role in ["clerk", "cashier"] and final_store_id is None:
        abort(HTTPStatus.BAD_REQUEST, description=f"Store ID is required for a {requested_role.capitalize()} user.")


    new_user = User(
        name=name,
        email=email,
        password=password, # User model's setter will hash it
        role=requested_role,
        created_by=current_user_id,
        store_id=final_store_id,
        is_active=False # New users are typically inactive until they set their password/activate
        # created_at and updated_at are typically handled automatically by SQLAlchemy defaults.
        # Do NOT pass them here unless your User model's __init__ explicitly accepts them.
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{requested_role.capitalize()} user created successfully",
        "user": serialize_user(new_user)
    }), HTTPStatus.CREATED


# --- UPDATE User (PUT method for full replacement or PATCH for partial) ---
@users_api_bp.route("/<int:user_id>", methods=["PUT", "PATCH"])
# @jwt_required() # REMOVED
# @role_required("merchant", "admin") # REMOVED
def update_user(user_id):
    """
    Updates an existing user's information (name, email, role, store_id, is_active).
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        schema: {type: integer}
        required: true
        description: The ID of the user to update.
      - in: body
        name: body
        schema:
          type: object
          properties:
            name: {type: string}
            email: {type: string, format: email}
            role: {type: string, enum: [admin, clerk, cashier]}
            store_id: {type: integer, nullable: true}
            is_active: {type: boolean}
    responses:
      200:
        description: User updated successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            user: {type: object}
      400: {description: Bad request, e.g., invalid data format.}
      403: {description: Forbidden, user does not have permission.}
      404: {description: User not found.}
      409: {description: Conflict, email already in use.}
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    user_to_update = User.query.get(user_id)
    if not user_to_update:
        abort(HTTPStatus.NOT_FOUND, description="User not found.")

    if user_id == current_user_id:
        abort(HTTPStatus.FORBIDDEN, description="You cannot modify your own account via this endpoint. Use profile endpoints.")

    data = request.get_json()
    if not data:
        abort(HTTPStatus.BAD_REQUEST, description="Request body must be JSON.")

    # Authorization logic (manual check since decorator is removed)
    can_update = False
    if current_user_role == "merchant":
        # Merchant can update admin, cashier, clerk roles (not other merchants)
        if user_to_update.role in ["admin", "cashier", "clerk"]:
            can_update = True
    elif current_user_role == "admin":
        # Admin can update cashier, clerk roles within their own store
        if user_to_update.role in ["cashier", "clerk"]:
            if current_user.store_id and user_to_update.store_id == current_user.store_id:
                can_update = True
    
    if not can_update:
        abort(HTTPStatus.FORBIDDEN, description="Unauthorized to update this user.")


    if 'name' in data:
        user_to_update.name = data['name']
    
    if 'email' in data:
        new_email = data['email']
        if not EMAIL_REGEX.match(new_email):
            abort(HTTPStatus.BAD_REQUEST, description="Invalid email format.")
        existing_user = User.query.filter(func.lower(User.email) == func.lower(new_email), User.id != user_id).first()
        if existing_user:
            abort(HTTPStatus.CONFLICT, description="Email already in use.")
        user_to_update.email = new_email
    
    if 'role' in data:
        new_role = data['role']
        assignable_roles = {
            "merchant": ["admin", "cashier", "clerk"],
            "admin": ["cashier", "clerk"]
        }
        if new_role not in assignable_roles.get(current_user_role, []):
            abort(HTTPStatus.FORBIDDEN, description=f"Unauthorized to assign role '{new_role}'.")
        user_to_update.role = new_role

    if 'store_id' in data:
        new_store_id = data['store_id']
        if current_user_role == "merchant":
            if new_store_id is not None and Store.query.get(new_store_id) is None:
                abort(HTTPStatus.BAD_REQUEST, description="Store not found.")
            user_to_update.store_id = new_store_id
        elif current_user_role == "admin":
            if new_store_id is not None:
                if not current_user.store_id or new_store_id != current_user.store_id:
                    abort(HTTPStatus.FORBIDDEN, description="Admin can only assign users to their own store.")
                if Store.query.get(new_store_id) is None:
                    abort(HTTPStatus.BAD_REQUEST, description="Store not found.")
                user_to_update.store_id = new_store_id
            else:
                 abort(HTTPStatus.FORBIDDEN, description="Admin cannot unassign users from a store.")

    if 'is_active' in data:
        if user_to_update.id == current_user_id:
            abort(HTTPStatus.FORBIDDEN, description="You cannot change your own active status.")
        user_to_update.is_active = data['is_active']
    
    user_to_update.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({
        "message": "User updated successfully",
        "user": serialize_user(user_to_update)
    }), HTTPStatus.OK


# --- DEACTIVATE User ---
@users_api_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
# @jwt_required() # REMOVED
# @role_required("merchant", "admin") # REMOVED
def deactivate_user(user_id):
    """
    Deactivates a user's account (sets is_active to False).
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        schema: {type: integer}
        required: true
        description: The ID of the user to deactivate.
    responses:
      200:
        description: User deactivated successfully.
        schema:
          type: object
          properties:
            message: {type: string}
            user: {type: object}
      403: {description: Forbidden, user does not have permission.}
      404: {description: User not found.}
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    target_user = User.query.get(user_id)
    if not target_user:
        abort(HTTPStatus.NOT_FOUND, description="User not found.")

    is_authorized, message = can_deactivate_user(current_user, target_user)
    if not is_authorized:
        abort(HTTPStatus.FORBIDDEN, description=message)

    if target_user.id == current_user_id:
        abort(HTTPStatus.FORBIDDEN, description="You cannot deactivate your own account.")

    target_user.is_active = False
    target_user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "message": "User deactivated successfully",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK


# --- DELETE User (Soft Delete) ---
@users_api_bp.route("/<int:user_id>", methods=["DELETE"])
# @jwt_required() # REMOVED
# @role_required("merchant", "admin") # REMOVED
def delete_user(user_id):
    """
    Soft-deletes a user account (sets is_deleted to True and modifies email).
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        schema: {type: integer}
        required: true
        description: The ID of the user to soft-delete.
    responses:
      200:
        description: User marked as deleted successfully.
        schema:
          type: object
          properties:
            message: {type: string}
      403: {description: Forbidden, user does not have permission.}
      404: {description: User not found.}
      409: {description: Conflict, user already deleted.}
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    target_user = User.query.get(user_id)
    if not target_user:
        abort(HTTPStatus.NOT_FOUND, description="User not found.")

    is_authorized, message = can_delete_user(current_user, target_user)
    if not is_authorized:
        abort(HTTPStatus.FORBIDDEN, description=message)

    if target_user.id == current_user_id:
        abort(HTTPStatus.FORBIDDEN, description="You cannot delete your own account.")

    if target_user.is_deleted:
        abort(HTTPStatus.CONFLICT, description="User already deleted.")

    target_user.is_deleted = True
    # Modify email to allow re-use of original email for a *new* user if needed,
    # while retaining uniqueness and historical data.
    target_user.email = f"{target_user.email}_deleted_{target_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    target_user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "User marked as deleted successfully"}), HTTPStatus.OK