from functools import wraps
import re
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required
)
from sqlalchemy import func
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.models import User
from app import db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Setup rate limiting per-IP
limiter = Limiter(get_remote_address, default_limits=["200 per day", "50 per hour"])
limiter.limit("10/minute")(auth_bp)

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w{2,}$")


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
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))

            if user is None or not user.is_active or user.role not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    """
    Authenticate user and return JWT access token.

    ---
    post:
      tags:
        - Authentication
      summary: Login a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        200:
          description: User authenticated
        400:
          description: Bad request
        401:
          description: Invalid credentials
        403:
          description: Account deactivated
    """
    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid JSON data in request body"}), 400

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter(func.lower(User.email) == func.lower(email)).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "This account has been deactivated"}), 403

    token = create_access_token(identity=str(user.id))

    return jsonify(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "store_id": user.store_id,
        },
    ), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def who_am_i():
    """
    Get current authenticated user's details.

    ---
    get:
      tags:
        - Authentication
      summary: Get current user details
      responses:
        200:
          description: User details retrieved
        401:
          description: Unauthorized
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(int(user_id))

    return jsonify(
        id=user.id,
        email=user.email,
        role=user.role,
        store_id=user.store_id,
    ), 200


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5/minute")
def register():
    """
    Register a new user.

    ---
    post:
      tags:
        - Authentication
      summary: Register a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - name
              properties:
                email:
                  type: string
                password:
                  type: string
                name:
                  type: string
                role:
                  type: string
                store_id:
                  type: integer
      responses:
        201:
          description: User registered successfully
        400:
          description: Invalid input or email already exists
    """
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    role = data.get("role", "user")
    store_id = data.get("store_id")

    if not email or not password or not name:
        return jsonify({"error": "Email, password, and name are required"}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    if User.query.filter(func.lower(User.email) == func.lower(email)).first():
        return jsonify({"error": "Email already exists"}), 400

    user = User(
        email=email,
        name=name,
        password=password,
        role=role,
        store_id=store_id
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201
