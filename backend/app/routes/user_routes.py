# app/routes/user_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Store, db # Import Store model
from app.services.user_services import can_deactivate_user, can_delete_user # Import the service functions
from app.routes.auth_routes import role_required, EMAIL_REGEX # Import role_required and EMAIL_REGEX
from sqlalchemy import func # Import func for lower()
from http import HTTPStatus
from datetime import datetime # Import datetime for soft delete email modification

# Renamed the blueprint instance to 'users_api_bp' and its internal name to 'users_api'
users_api_bp = Blueprint("users_api", __name__, url_prefix="/api/users")

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

# --- GET All Users (for Merchant/Admin to view) ---
@users_api_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin") # Merchant and Admin can view users
def get_all_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    if current_user.role == "merchant":
        # Filter out deleted users for merchant view
        users = User.query.filter_by(is_deleted=False).all()
    elif current_user.role == "admin" and current_user.store_id:
        # Filter out deleted users for admin view within their store
        users = User.query.filter_by(store_id=current_user.store_id, is_deleted=False).all()
    else:
        return jsonify({"error": "Unauthorized to view all users"}), HTTPStatus.FORBIDDEN

    return jsonify([serialize_user(user) for user in users]), HTTPStatus.OK

# --- GET Users by Store ID (for Store Admin to view users in their store) ---
@users_api_bp.route("/stores/<int:store_id>/users", methods=["GET"])
@jwt_required()
@role_required("admin") # Only Store Admins should typically access this specific route
def get_users_by_store(store_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    # Authorization check: Store Admin can only view users in their assigned store
    if current_user.role == 'admin':
        if not current_user.store_id or current_user.store_id != store_id:
            return jsonify({"error": "Unauthorized to view users for this store."}), HTTPStatus.FORBIDDEN
    else: # Other roles like Merchant would use the general /api/users/ endpoint
        return jsonify({"error": "Unauthorized to access this endpoint."}), HTTPStatus.FORBIDDEN

    # ⭐ FIX: Removed 'user' from allowed_roles_for_admin_view ⭐
    allowed_roles_for_admin_view = ['cashier', 'clerk']
    users_in_store = User.query.filter(
        User.store_id == store_id,
        User.role.in_(allowed_roles_for_admin_view),
        User.is_deleted == False
    ).all()

    return jsonify([serialize_user(user) for user in users_in_store]), HTTPStatus.OK


# --- GET User by ID (for editing) ---
@users_api_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin") # Merchant and Admin can view individual users
def get_user_by_id(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    if current_user.role == "admin":
        if not current_user.store_id or user.store_id != current_user.store_id:
            return jsonify({"error": "Unauthorized to view this user"}), HTTPStatus.FORBIDDEN
    
    return jsonify(serialize_user(user)), HTTPStatus.OK


# --- CREATE User ---
@users_api_bp.route("/create", methods=["POST"])
@jwt_required()
@role_required("merchant", "admin", "clerk") # Assuming merchant/admin/clerk can create specific roles
def create_user():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password") # Get the password from request data
    requested_role = data.get("role")
    store_id = data.get("store_id")

    if not all([name, email, password, requested_role]): # Ensure password is among required fields
        return jsonify({"error": "Missing name, email, password, or role"}), HTTPStatus.BAD_REQUEST

    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email format"}), HTTPStatus.BAD_REQUEST

    # Check for existing email (case-insensitive) - active or deleted
    if User.query.filter(func.lower(User.email) == func.lower(email)).first():
        return jsonify({"error": "Email already exists"}), HTTPStatus.CONFLICT

    allowed_roles_to_create = {
        # ⭐ FIX: Removed 'user' from roles a merchant can create ⭐
        "merchant": ["admin", "cashier", "clerk"], 
        # ⭐ FIX: Removed 'user' from roles an admin can create ⭐
        "admin": ["cashier", "clerk"], 
        # ⭐ FIX: Removed 'user' from roles a clerk can create ⭐
        "clerk": ["cashier"], 
    }

    if requested_role not in allowed_roles_to_create.get(current_user.role, []):
        return jsonify({"error": f"Your role ({current_user.role}) is not allowed to create '{requested_role}' users"}), HTTPStatus.FORBIDDEN

    if requested_role == "admin" and current_user.role == "merchant":
        if not store_id:
            return jsonify({"error": "Store ID is required when creating an Admin"}), HTTPStatus.BAD_REQUEST
        if Store.query.get(store_id) is None:
            return jsonify({"error": "Invalid Store ID provided"}), HTTPStatus.BAD_REQUEST
        if current_user.store_id and store_id != current_user.store_id:
             return jsonify({"error": "Merchant can only create admins for their assigned store"}), HTTPStatus.FORBIDDEN
    elif current_user.role in ["admin", "clerk", "cashier"]:
        if not current_user.store_id:
            return jsonify({"error": f"Your account is not assigned to a store. Cannot create users."}), HTTPStatus.FORBIDDEN
        if store_id and store_id != current_user.store_id:
            return jsonify({"error": f"{current_user.role.capitalize()} can only create users for their assigned store."}), HTTPStatus.FORBIDDEN
        store_id = current_user.store_id # Force new user to be in the current user's store
    else: # If a public user somehow hits this (though it's protected) or other edge cases
        store_id = None

    new_user = User(
        name=name,
        email=email,
        password=password, # Pass the password directly to the User constructor
        role=requested_role,
        created_by=current_user_id,
        store_id=store_id
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{requested_role.capitalize()} user created successfully",
        "user": serialize_user(new_user)
    }), HTTPStatus.CREATED


# --- UPDATE User (PUT method for full replacement or PATCH for partial) ---
@users_api_bp.route("/<int:user_id>", methods=["PUT", "PATCH"])
@jwt_required()
@role_required("merchant", "admin")
def update_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    user_to_update = User.query.get(user_id)
    if not user_to_update:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    if user_id == current_user_id:
        return jsonify({"error": "You cannot modify your own account via this endpoint."}), HTTPStatus.FORBIDDEN

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), HTTPStatus.BAD_REQUEST

    can_update = False
    if current_user.role == "merchant":
        if user_to_update.role != "merchant":
            can_update = True
    elif current_user.role == "admin":
        # ⭐ FIX: Removed 'user' from assignable roles for admin ⭐
        if user_to_update.role in ["cashier", "clerk"]:
            if current_user.store_id and user_to_update.store_id == current_user.store_id:
                can_update = True

    if not can_update:
        return jsonify({"error": "Unauthorized to update this user."}), HTTPStatus.FORBIDDEN

    if 'name' in data:
        user_to_update.name = data['name']
    if 'email' in data:
        new_email = data['email']
        if not EMAIL_REGEX.match(new_email):
            return jsonify({"error": "Invalid email format"}), HTTPStatus.BAD_REQUEST
        existing_user = User.query.filter(func.lower(User.email) == func.lower(new_email), User.id != user_id).first()
        if existing_user:
            return jsonify({"error": "Email already in use"}), HTTPStatus.CONFLICT
        user_to_update.email = new_email
    if 'role' in data:
        new_role = data['role']
        assignable_roles = {
            # ⭐ FIX: Removed 'user' from assignable roles for merchant ⭐
            "merchant": ["admin", "cashier", "clerk"],
            # ⭐ FIX: Removed 'user' from assignable roles for admin ⭐
            "admin": ["cashier", "clerk"]
        }
        if new_role not in assignable_roles.get(current_user.role, []):
            return jsonify({"error": f"Unauthorized to assign role '{new_role}'"}), HTTPStatus.FORBIDDEN
        user_to_update.role = new_role

    if 'store_id' in data:
        new_store_id = data['store_id']
        if current_user.role == "merchant":
            if new_store_id is not None and Store.query.get(new_store_id) is None:
                return jsonify({"error": "Store not found"}), HTTPStatus.BAD_REQUEST
            user_to_update.store_id = new_store_id
        elif current_user.role == "admin":
            if new_store_id is not None:
                if not current_user.store_id or new_store_id != current_user.store_id:
                    return jsonify({"error": "Admin can only assign users to their own store."}), HTTPStatus.FORBIDDEN
                if Store.query.get(new_store_id) is None:
                    return jsonify({"error": "Store not found"}), HTTPStatus.BAD_REQUEST
                user_to_update.store_id = new_store_id
            else:
                 return jsonify({"error": "Admin cannot unassign users from a store."}), HTTPStatus.FORBIDDEN

    if 'is_active' in data:
        if user_to_update.id == current_user_id:
            return jsonify({"error": "You cannot change your own active status."}), HTTPStatus.FORBIDDEN
        user_to_update.is_active = data['is_active']

    db.session.commit()
    return jsonify({
        "message": "User updated successfully",
        "user": serialize_user(user_to_update)
    }), HTTPStatus.OK


# --- DEACTIVATE User ---
@users_api_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
@role_required("merchant", "admin")
def deactivate_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    is_authorized, message = can_deactivate_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.id == current_user_id:
        return jsonify({"error": "You cannot deactivate your own account."}), HTTPStatus.FORBIDDEN

    target_user.is_active = False
    db.session.commit()

    return jsonify({
        "message": "User deactivated successfully",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK


# --- DELETE User (Soft Delete) ---
@users_api_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant", "admin")
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    is_authorized, message = can_delete_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.id == current_user_id:
        return jsonify({"error": "You cannot delete your own account."}), HTTPStatus.FORBIDDEN

    if target_user.is_deleted:
        return jsonify({"error": "User already deleted"}), HTTPStatus.CONFLICT

    target_user.is_deleted = True
    # Modify email to allow re-use of original email for a *new* user if needed,
    # while retaining uniqueness and historical data.
    target_user.email = f"{target_user.email}_deleted_{target_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    db.session.commit()

    return jsonify({"message": "User marked as deleted successfully"}), HTTPStatus.OK
