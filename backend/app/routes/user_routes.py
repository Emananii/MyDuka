from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Store, db
from app.services.user_services import can_deactivate_user, can_delete_user
from app.auth.utils import hash_password
from http import HTTPStatus

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    """
    Get users filtered by role.
    ---
    parameters:
      - name: role
        in: query
        type: string
        enum: [merchant, admin, clerk, cashier]
        description: Filter users by role
    responses:
      200:
        description: List of users
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  id: { type: integer }
                  name: { type: string }
                  email: { type: string }
                  role: { type: string }
                  is_active: { type: boolean }
      403:
        description: Unauthorized access
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get_or_404(current_user_id)
    if not current_user.is_active:
        return jsonify({"error": "Inactive user"}), HTTPStatus.FORBIDDEN
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    role = request.args.get('role')
    query = User.query.filter_by(is_deleted=False)
    if role:
        query = query.filter_by(role=role)
    users = query.all()
    return jsonify([{
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'role': u.role,
        'is_active': u.is_active
    } for u in users]), HTTPStatus.OK

@users_bp.route('', methods=['POST'])
@jwt_required()
def create_user():
    """
    Create a new user (e.g., clerk).
    ---
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              name: { type: string }
              email: { type: string }
              password: { type: string }
              role: { type: string, enum: [merchant, admin, clerk, cashier] }
    responses:
      201:
        description: Created user
        content:
          application/json:
            schema:
              type: object
              properties:
                id: { type: integer }
                name: { type: string }
                email: { type: string }
                role: { type: string }
                is_active: { type: boolean }
      400:
        description: Missing fields or invalid role
      403:
        description: Unauthorized access
      409:
        description: Email already exists
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get_or_404(current_user_id)
    if not current_user.is_active:
        return jsonify({"error": "Inactive user"}), HTTPStatus.FORBIDDEN
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    data = request.get_json()
    name, email, password, role = data.get("name"), data.get("email"), data.get("password"), data.get("role")
    if not all([name, email, password, role]):
        return jsonify({"error": "Missing name, email, password, or role"}), HTTPStatus.BAD_REQUEST
    if role not in ['merchant', 'admin', 'clerk', 'cashier']:
        return jsonify({"error": "Invalid role"}), HTTPStatus.BAD_REQUEST
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), HTTPStatus.CONFLICT

    new_user = User(
        name=name,
        email=email,
        role=role,
        created_by=current_user_id,
        store_id=current_user.store_id
    )
    new_user.password_hash = hash_password(password)  # Use hash_password from models
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{role.capitalize()} created",
        "user": new_user.to_dict()
    }), HTTPStatus.CREATED

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get the profile of the authenticated user.
    ---
    responses:
      200:
        description: User profile data
        content:
          application/json:
            schema:
              type: object
              properties:
                id: { type: integer }
                name: { type: string }
                email: { type: string }
                role: { type: string }
                store_id: { type: integer }
                store_name: { type: string }
      404:
        description: User not found
    """
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

@users_bp.route("/<int:user_id>/deactivate", methods=["POST"])
@jwt_required()
def deactivate_user(user_id):
    """
    Deactivate a user.
    ---
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of the user to deactivate
    responses:
      200:
        description: User deactivated
        content:
          application/json:
            schema:
              type: object
              properties:
                message: { type: string }
                user: { type: object }
      403:
        description: Unauthorized access
      404:
        description: User not found
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get_or_404(current_user_id)
    if not current_user.is_active:
        return jsonify({"error": "Inactive user"}), HTTPStatus.FORBIDDEN
    if not can_deactivate_user(current_user, User.query.get(user_id)):
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get_or_404(user_id)
    if not target_user.is_active:
        return jsonify({"error": "User already deactivated"}), HTTPStatus.CONFLICT

    target_user.is_active = False
    db.session.commit()

    return jsonify({
        "message": "User deactivated",
        "user": target_user.to_dict()
    }), HTTPStatus.OK

@users_bp.route("/<int:user_id>/reactivate", methods=["POST"])
@jwt_required()
def reactivate_user(user_id):
    """
    Reactivate a user.
    ---
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of the user to reactivate
    responses:
      200:
        description: User reactivated
        content:
          application/json:
            schema:
              type: object
              properties:
                message: { type: string }
                user: { type: object }
      403:
        description: Unauthorized access
      404:
        description: User not found
      409:
        description: User already active
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get_or_404(current_user_id)
    if not current_user.is_active:
        return jsonify({"error": "Inactive user"}), HTTPStatus.FORBIDDEN
    if not can_deactivate_user(current_user, User.query.get(user_id)):  # Reuse can_deactivate_user for permission check
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get_or_404(user_id)
    if target_user.is_active:
        return jsonify({"error": "User already active"}), HTTPStatus.CONFLICT

    target_user.is_active = True
    db.session.commit()

    return jsonify({
        "message": "User reactivated",
        "user": target_user.to_dict()
    }), HTTPStatus.OK

@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    """
    Delete a user (soft delete).
    ---
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of the user to delete
    responses:
      200:
        description: User deleted
      403:
        description: Unauthorized access
      404:
        description: User not found
      409:
        description: User already deleted
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get_or_404(current_user_id)
    if not current_user.is_active:
        return jsonify({"error": "Inactive user"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get_or_404(user_id)
    is_authorized, message = can_delete_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.is_deleted:
        return jsonify({"error": "User already deleted"}), HTTPStatus.CONFLICT

    target_user.is_deleted = True
    target_user.email = f"{target_user.email}_deleted_{target_user.id}"
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), HTTPStatus.OK