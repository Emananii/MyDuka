from flask import Blueprint, request, jsonify, abort
from datetime import datetime, timezone
from app import db
from app.models import User, Store
from app.services.user_services import can_deactivate_user, can_delete_user
from app.routes.auth_routes import EMAIL_REGEX
from sqlalchemy import func
from http import HTTPStatus

users_api_bp = Blueprint("users_api", __name__, url_prefix="/api/users")

def get_debug_user_info():
    debug_user_id = 1
    debug_user = User.query.get(debug_user_id)
    if debug_user:
        print(f"DEBUG: get_debug_user_info() returning ID: {debug_user.id}, Role: {debug_user.role}")
        return debug_user.id, debug_user.role
    abort(500, description="Debug user (ID 1) not found. Please seed your database or configure a valid debug user.")

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

# --- This is the key updated method ---
def get_user_accessible_store_ids(user_id, user_role):
    """
    Determines which store IDs a user has access to based on their role.
    Merchant users, being business owners, can access all non-deleted stores.
    """
    user = User.query.get(user_id)

    if not user:
        return []

    if user_role == "merchant":
        # Merchant is the business owner and can access ALL non-deleted stores.
        return [s.id for s in Store.query.filter_by(is_deleted=False).all()]
    elif user_role == "admin":
        # Admin can only access their assigned store
        if user.store_id and user.store and not user.store.is_deleted:
            return [user.store_id]
        return []
    elif user_role in ("clerk", "cashier"):
        # Clerks/Cashiers can only access their assigned store
        if user.store_id and user.store and not user.store.is_deleted:
            return [user.store_id]
    return []

def check_store_access(store_id, current_user_id, current_user_role):
    accessible_ids = get_user_accessible_store_ids(current_user_id, current_user_role)
    if store_id not in accessible_ids:
        abort(403, description="Forbidden: You do not have access to this store.")


# --- GET All Users (for Merchant/Admin to view) ---
@users_api_bp.route("/", methods=["GET"])
def get_all_users():
    """
    Lists all users with pagination and filtering.
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    if current_user_role not in ["merchant", "admin"]:
        abort(403, description="Forbidden: Only merchants and admins can view all users.")

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_query = request.args.get('search', type=str)
    role_filter = request.args.get('role', type=str)
    status_filter = request.args.get('status', type=str)
    store_id_filter = request.args.get('store_id', type=int)
    is_deleted_filter = request.args.get('is_deleted', type=str)

    users_query = User.query

    if current_user_role == "merchant":
        # A merchant, being a super user, can see all non-merchant users regardless of store_id,
        # as all stores implicitly belong to them.
        users_query = users_query.filter(User.role != "merchant")
        # If a store_id filter is provided, it applies to all users for the merchant.
        if store_id_filter:
            check_store_access(store_id_filter, current_user_id, current_user_role) # Still validate merchant has access to requested store_id (they will if it's not deleted)
            users_query = users_query.filter_by(store_id=store_id_filter)
        # If no store_id filter, merchant sees users from all non-deleted stores.
        else:
            all_accessible_store_ids = get_user_accessible_store_ids(current_user_id, current_user_role)
            if all_accessible_store_ids:
                users_query = users_query.filter(User.store_id.in_(all_accessible_store_ids))
            else: # No active stores mean no users linked to stores
                users_query = users_query.filter(False) # Return empty set

    elif current_user_role == "admin":
        # Admin can only see users within their own assigned store.
        if current_user.store_id:
            users_query = users_query.filter_by(store_id=current_user.store_id)
            if store_id_filter and store_id_filter != current_user.store_id:
                abort(403, description="Forbidden: Admin can only filter by their assigned store ID.")
        else:
            # If admin isn't assigned to a store, they shouldn't see any store-specific users.
            users_query = users_query.filter(False) # Return empty set


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
    
    # Apply is_deleted filter last
    if is_deleted_filter is not None:
        if current_user_role == "admin":
            if is_deleted_filter.lower() == 'true':
                users_query = users_query.filter_by(is_deleted=True)
            elif is_deleted_filter.lower() == 'false':
                users_query = users_query.filter_by(is_deleted=False)
            else:
                abort(400, "Invalid value for 'is_deleted'. Must be 'true' or 'false'.")
        else:
            users_query = users_query.filter_by(is_deleted=False)
    else:
        users_query = users_query.filter_by(is_deleted=False)

    users_query = users_query.order_by(User.name)

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
            'store_name': user.store.name if user.store else 'N/A',
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
def get_users_by_store(store_id):
    """
    Retrieves users associated with a specific store, accessible by admins of that store.
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    # Only admins are explicitly allowed here by role check.
    # Merchants *can* view users by store via the general GET /users endpoint with store_id filter.
    if current_user_role != 'admin':
        abort(403, description="Forbidden: Only admins can access this endpoint.")
    
    # Admin can only view users for *their* assigned store
    if not current_user.store_id or current_user.store_id != store_id:
        abort(403, description="Forbidden: Admin can only view users for their assigned store.")

    store = Store.query.get_or_404(store_id)

    allowed_roles_for_admin_view = ['cashier', 'clerk']
    users_in_store = User.query.filter(
        User.store_id == store_id,
        User.role.in_(allowed_roles_for_admin_view),
        User.is_deleted == False
    ).all()

    return jsonify([serialize_user(user) for user in users_in_store]), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>", methods=["GET"])
def get_user_by_id(user_id):
    """
    Retrieves details of a specific user by ID.
    """
    current_user_id, current_user_role = get_debug_user_info()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        abort(403, description="Invalid or inactive user.")

    user = User.query.get(user_id)
    if not user:
        abort(HTTPStatus.NOT_FOUND, description="User not found.")

    if current_user_role == "merchant":
        # Merchant can view their own profile.
        # Merchant can view any non-merchant user in any store (since they own all stores).
        if user.role == "merchant" and user.id != current_user_id:
            abort(403, description="Forbidden: Merchant cannot view other merchant's profiles.")
        # No specific store_id check needed for merchants here, as they have access to all.
        # However, it's good practice to ensure the target user isn't in a *deleted* store unless explicitly allowed for merchant.
        if user.store_id and user.store and user.store.is_deleted:
            abort(403, description="Forbidden: Cannot view users in a deleted store.")
    elif current_user_role == "admin":
        # Admin can view users within their own assigned store.
        if not current_user.store_id or user.store_id != current_user.store_id:
            abort(403, description="Forbidden: Admin can only view users in their assigned store.")
    else:
        abort(403, description="Forbidden: Your role does not allow viewing arbitrary user profiles.")
    
    return jsonify(serialize_user(user)), HTTPStatus.OK


# --- CREATE User ---
@users_api_bp.route("/", methods=["POST"])
def create_user():
    """
    Creates a new user account.
    """
    current_user_id = get_jwt_identity()
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
        return jsonify({"error": "Missing name, email, password, or role"}), HTTPStatus.BAD_REQUEST

    if not EMAIL_REGEX.match(email):
        abort(HTTPStatus.BAD_REQUEST, description="Invalid email format.")

    if User.query.filter(func.lower(User.email) == func.lower(email)).first():
        abort(HTTPStatus.CONFLICT, description="Email already exists.")

    allowed_roles_to_create = {
        "merchant": ["cashier", "clerk"],
        "admin": ["cashier", "clerk"],
        "clerk": ["cashier"],
    }

    if requested_role not in allowed_roles_to_create.get(current_user_role, []):
        abort(HTTPStatus.FORBIDDEN, description=f"Your role ({current_user_role}) is not allowed to create '{requested_role}' users.")

    final_store_id = None

    if current_user_role == "merchant":
        # Merchant (super user) can create admins, clerks, cashiers for ANY valid store.
        if requested_role in ["admin", "clerk", "cashier"]:
            if store_id is not None:
                store = Store.query.get(store_id)
                if not store:
                    abort(HTTPStatus.NOT_FOUND, description="Invalid Store ID provided.")
                if store.is_deleted:
                    abort(HTTPStatus.BAD_REQUEST, description="Cannot assign user to a deleted store.")
                # Since the merchant is a super user, they can assign users to any existing, non-deleted store.
                final_store_id = store_id
            else:
                # For admins, clerks, and cashiers, a store_id is generally required.
                # If merchant tries to create one without a store_id, it's a bad request.
                abort(HTTPStatus.BAD_REQUEST, description=f"Store ID is required for a {requested_role.capitalize()} user.")

    elif current_user_role in ["admin", "clerk"]:
        if not current_user.store_id:
            abort(HTTPStatus.FORBIDDEN, description=f"Your account is not assigned to a store. Cannot create users.")
        
        # Admins/Clerks can only create users for their assigned store.
        if store_id and store_id != current_user.store_id:
            abort(HTTPStatus.FORBIDDEN, description=f"{current_user_role.capitalize()} can only create users for their assigned store.")
        
        # If store_id is not provided in request or is the same as current user's, force new user to be in current user's store.
        final_store_id = current_user.store_id

    # Final check for roles that MUST have a store_id.
    # This also catches cases where a merchant might attempt to create without store_id for required roles.
    if requested_role in ["admin", "clerk", "cashier"] and final_store_id is None:
        abort(HTTPStatus.BAD_REQUEST, description=f"Store ID is required for a {requested_role.capitalize()} user.")

    new_user = User(
        name=name,
        email=email,
        password=password,
        role=requested_role,
        created_by=current_user_id,
        store_id=final_store_id,
        is_active=False
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{requested_role.capitalize()} user created successfully",
        "user": serialize_user(new_user)
    }), HTTPStatus.CREATED

@users_api_bp.route("/<int:user_id>", methods=["PUT", "PATCH"])
def update_user(user_id):
    """
    Updates an existing user's information (name, email, role, store_id, is_active).
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

    can_update = False
    if current_user_role == "merchant":
        # Merchant can update admin, cashier, clerk roles (not other merchants).
        if user_to_update.role in ["admin", "cashier", "clerk"]:
            can_update = True
    elif current_user_role == "admin":
        # Admin can update cashier, clerk roles within their own store.
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
            if new_store_id is not None:
                store = Store.query.get(new_store_id)
                if not store:
                    abort(HTTPStatus.BAD_REQUEST, description="Store not found.")
                if store.is_deleted:
                    abort(HTTPStatus.BAD_REQUEST, description="Cannot assign user to a deleted store.")
                user_to_update.store_id = new_store_id
            else:
                # A merchant can unset a store_id if needed, but consider if specific roles *must* have one.
                # For simplicity, allowing null for merchant updates.
                user_to_update.store_id = None 
        elif current_user_role == "admin":
            if new_store_id is not None:
                if not current_user.store_id or new_store_id != current_user.store_id:
                    abort(HTTPStatus.FORBIDDEN, description="Admin can only assign users to their own store.")
                if Store.query.get(new_store_id) is None:
                    abort(HTTPStatus.BAD_REQUEST, description="Store not found.")
                if Store.query.get(new_store_id).is_deleted:
                    abort(HTTPStatus.BAD_REQUEST, description="Cannot assign user to a deleted store.")
                user_to_update.store_id = new_store_id
            else:
                return jsonify({"error": "Admin cannot unassign users from a store."}), HTTPStatus.FORBIDDEN

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

@users_api_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    store = Store.query.get(user.store_id) if user.store_id else None
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'store_id': user.store_id,
        'store_name': store.name if store else None
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
def deactivate_user(user_id):
    """
    Deactivates a user's account (sets is_active to False).
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
        return jsonify({"error": "You cannot deactivate your own account."}), HTTPStatus.FORBIDDEN

    if not target_user.is_active:
        return jsonify({"error": "User already deactivated"}), HTTPStatus.CONFLICT

    target_user.is_active = False
    target_user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "message": "User deactivated successfully",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>/reactivate", methods=["POST"])
@jwt_required()
@role_required("merchant", "admin")
def reactivate_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get_or_404(user_id)
    is_authorized, message = can_deactivate_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.is_active:
        return jsonify({"error": "User already active"}), HTTPStatus.CONFLICT

    target_user.is_active = True
    db.session.commit()

    return jsonify({
        "message": "User reactivated",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant", "admin")
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get_or_404(user_id)
    is_authorized, message = can_deactivate_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.is_active:
        return jsonify({"error": "User already active"}), HTTPStatus.CONFLICT

    target_user.is_active = True
    db.session.commit()

    return jsonify({
        "message": "User reactivated",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """
    Soft-deletes a user account (sets is_deleted to True and modifies email).
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
    target_user.email = f"{target_user.email}_deleted_{target_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    target_user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "User marked as deleted successfully"}), HTTPStatus.OK