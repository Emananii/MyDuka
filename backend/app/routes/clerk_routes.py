# backend/routes/clerk_routes.py

from flask import Blueprint, request, jsonify, abort
from app.models import db, User
from app.routes.user_routes import serialize_user # Assuming serialize_user is in user_routes.py
# from app.auth.utils import hash_password # Removed: User model's setter handles hashing
from http import HTTPStatus
from datetime import datetime, timezone # Still needed for soft delete email modification if applicable

clerk_bp = Blueprint("clerk_routes", __name__, url_prefix="/api/clerks")

# Admin: Get all clerks
@clerk_bp.route("/", methods=["GET"])
def get_clerks():
    """
    Retrieves a list of all clerk users.
    """
    clerks = User.query.filter_by(role="clerk", is_deleted=False).all()
    return jsonify([serialize_user(clerk) for clerk in clerks]), HTTPStatus.OK

# Admin: Create Clerk
@clerk_bp.route("", methods=["POST"]) # Handles /api/clerks
@clerk_bp.route("/", methods=["POST"]) # Handles /api/clerks/
def create_clerk():
    """
    Creates a new clerk user account.
    """
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    
    if not all([name, email, password]):
        return jsonify({"error": "Missing name, email, or password"}), HTTPStatus.BAD_REQUEST

    if User.query.filter_by(email=email).first():
        abort(HTTPStatus.CONFLICT, description="Email already exists.")

    # Pass the plain text password directly to the 'password' property of the User model.
    # The User model's setter method (if correctly implemented) will handle hashing.
    new_clerk = User(
        name=name,
        email=email,
        password=password,  # Pass the plain text password here
        role="clerk",
        is_active=True
        # Removed created_at and updated_at as they are likely handled automatically by the model
    )

    db.session.add(new_clerk)
    db.session.commit()

    return jsonify({
        "message": "Clerk account created successfully",
        "user": serialize_user(new_clerk)
    }), HTTPStatus.CREATED


# Admin: Activate clerk
@clerk_bp.route("/<int:user_id>/activate", methods=["PATCH"])
def activate_clerk(user_id):
    """
    Activates a clerk's account (sets is_active to True).
    """
    clerk = User.query.get(user_id)
    if not clerk:
        abort(HTTPStatus.NOT_FOUND, description="Clerk not found.")
    
    if clerk.role != "clerk":
        abort(HTTPStatus.BAD_REQUEST, description="User is not a clerk.")

    if clerk.is_active:
        abort(HTTPStatus.CONFLICT, description="Clerk already active.")

    clerk.is_active = True
    clerk.updated_at = datetime.now(timezone.utc) # Update timestamp if not auto-handled by ORM on update
    db.session.commit()
    return jsonify({"message": "Clerk activated", "user": serialize_user(clerk)}), HTTPStatus.OK

# Admin: Deactivate clerk
@clerk_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
def deactivate_clerk(user_id):
    """
    Deactivates a clerk's account (sets is_active to False).
    """
    clerk = User.query.get(user_id)
    if not clerk:
        abort(HTTPStatus.NOT_FOUND, description="Clerk not found.")

    if clerk.role != "clerk":
        abort(HTTPStatus.BAD_REQUEST, description="User is not a clerk.")

    if not clerk.is_active:
        abort(HTTPStatus.CONFLICT, description="Clerk already deactivated.")

    clerk.is_active = False
    clerk.updated_at = datetime.now(timezone.utc) # Update timestamp if not auto-handled by ORM on update
    db.session.commit()
    return jsonify({"message": "Clerk deactivated", "user": serialize_user(clerk)}), HTTPStatus.OK

# Admin: Delete clerk (Soft Delete)
@clerk_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_clerk(user_id):
    """
    Soft-deletes a clerk's account (sets is_deleted to True).
    """
    clerk = User.query.get(user_id)
    if not clerk:
        abort(HTTPStatus.NOT_FOUND, description="Clerk not found.")
    
    if clerk.role != "clerk":
        abort(HTTPStatus.BAD_REQUEST, description="User is not a clerk.")

    if clerk.is_deleted:
        abort(HTTPStatus.CONFLICT, description="Clerk already deleted.")

    # Perform a soft delete
    clerk.is_deleted = True
    # Modify email to prevent reuse and indicate deletion
    clerk.email = f"{clerk.email}_deleted_{clerk.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    clerk.updated_at = datetime.now(timezone.utc) # Update timestamp if not auto-handled by ORM on update
    db.session.commit()
    return jsonify({"message": "Clerk soft-deleted", "user": serialize_user(clerk)}), HTTPStatus.OK