from functools import wraps
from flask import Blueprint, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash
from app.models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def role_required(*allowed_roles):
    """
    Decorator to enforce role-based access.
    Usage:
        @role_required("merchant")
        def view_func(): ...
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            from app import db
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if user is None or user.role not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return JWT token.
    Expected JSON:
        { "email": "merchant@myduka.com", "password": "merchant123" }
    """
    from app import db
    data = request.get_json(force=True)
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_digest, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=user.id)

    return jsonify(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "store_id": user.store_id,
        },
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def who_am_i():
    from app import db 
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    return jsonify(
        id=user.id,
        email=user.email,
        role=user.role,
        store_id=user.store_id,
    )
