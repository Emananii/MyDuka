from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, db
from app.services.user_services import can_deactivate_user, can_delete_user
from http import HTTPStatus

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/create", methods=["POST"])
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    # Determine new user role
    role_hierarchy = {
        "merchant": "admin",
        "admin": "clerk",
        "clerk": "cashier"
    }
    new_role = role_hierarchy.get(current_user.role)
    if not new_role:
        return jsonify({"error": "Your role is not allowed to create users"}), HTTPStatus.FORBIDDEN

    data = request.get_json()
    name, email, password = data.get("name"), data.get("email"), data.get("password")

    if not all([name, email, password]):
        return jsonify({"error": "Missing name, email, or password"}), HTTPStatus.BAD_REQUEST

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), HTTPStatus.CONFLICT

    new_user = User(
        name=name,
        email=email,
        role=new_role,
        created_by=current_user_id,
        store_id=current_user.store_id
    )
    # Hash password if not handled by model
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{new_role.capitalize()} created",
        "user": new_user.to_dict()
    }), HTTPStatus.CREATED


@users_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
def deactivate_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    if not can_deactivate_user(current_user, target_user):
        return jsonify({"error": "Unauthorized"}), HTTPStatus.FORBIDDEN

    target_user.is_active = False
    db.session.commit()

    return jsonify({
        "message": "User deactivated",
        "user": target_user.to_dict()
    }), HTTPStatus.OK


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    is_authorized, message = can_delete_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.is_deleted:
        return jsonify({"error": "User already deleted"}), HTTPStatus.CONFLICT

    target_user.is_deleted = True
    target_user.email = f"{target_user.email}_deleted_{target_user.id}"
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), HTTPStatus.OK
