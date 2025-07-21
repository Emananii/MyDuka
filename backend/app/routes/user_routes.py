
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, db
from app.services.user_services import can_create_user, can_deactivate_user, can_delete_user
from http import HTTPStatus

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

@users_bp.route("/create", methods=["POST"])
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    if not can_create_user(current_user):
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    name = data.get("name")

    # Input validation
    if not all([name, email, password, role]):
        return jsonify({"error": "Missing name, email, password, or role"}), HTTPStatus.BAD_REQUEST

    # Role restrictions
    if current_user.role == "merchant" and role.lower() != "admin":
        return jsonify({"error": "Merchants can only create Admins"}), HTTPStatus.FORBIDDEN

    if current_user.role == "admin" and role.lower() not in ["clerk", "cashier"]:
        return jsonify({"error": "Admins can only create Clerks or Cashiers"}), HTTPStatus.FORBIDDEN

    
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), HTTPStatus.CONFLICT

    
    new_user = User(
        name=name,
        email=email,
        password=password,  
        role=role.lower(),
        created_by=current_user_id,
        store_id=current_user.store_id
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created", "user": new_user.to_dict()}), HTTPStatus.CREATED


@users_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
def deactivate_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    if not can_deactivate_user(current_user, user_id):
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get(user_id)

    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    target_user.is_active = False
    db.session.commit()

    return jsonify({"message": "User deactivated", "user": target_user.to_dict()}), HTTPStatus.OK


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    is_authorized, message = can_delete_user(current_user, user_id)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    target_user = User.query.get(user_id)

    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    if target_user.is_deleted:
        return jsonify({"error": "User already deleted"}), HTTPStatus.NOT_FOUND

    target_user.is_deleted = True  
    target_user.email = f"{target_user.email}_deleted_{target_user.id}"

    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), HTTPStatus.OK
