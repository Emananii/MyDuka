from functools import wraps
from flask import Blueprint, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
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
    if user is None or not user.check_password(password):
         # Use the check_password method in the User model for verification
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))

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


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    Expected JSON:
        { "email": "test@myduka.com", "password": "test123", "role": "user", "store_id": null }
    """
    from app import db
    data = request.get_json(force=True)
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")  # Added
    role = data.get("role")
    store_id = data.get("store_id")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    user = User(
        email=email,
        name=name, # Added
        password=password,  # Corrected: Use 'password'
        role=role or "user",
        store_id=store_id
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201