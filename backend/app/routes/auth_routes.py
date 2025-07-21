from functools import wraps
from flask import Blueprint, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
from app.models import User # Ensure User is imported
from app.auth.utils import hash_password, verify_password # Ensure these are imported if used by User model

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
            from app import db # Import db here to avoid circular import issues if db is in __init__.py
            user_id = get_jwt_identity()
            # Ensure user_id is properly cast back to int if it was stored as string in token
            user = User.query.get(int(user_id)) # <--- IMPORTANT: Cast get_jwt_identity() back to int for DB lookup

            if user is None or not user.is_active or user.role not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return JWT access token.
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              format: email
              description: User's email address.
              example: merchant@myduka.com
            password:
              type: string
              format: password
              description: User's password.
              example: merchant123
    responses:
      200:
        description: User authenticated successfully.
        schema:
          type: object
          properties:
            access_token:
              type: string
              description: JWT access token.
              example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
            user:
              type: object
              properties:
                id:
                  type: integer
                  example: 1
                email:
                  type: string
                  example: merchant@myduka.com
                role:
                  type: string
                  example: merchant
                store_id:
                  type: integer
                  nullable: true
                  example: 1
      400:
        description: Bad request, missing email or password.
        schema:
          type: object
          properties:
            error:
              type: string
              example: Email and password are required
      401:
        description: Unauthorized, invalid credentials.
        schema:
          type: object
          properties:
            error:
              type: string
              example: Invalid credentials
    """
    from app import db # Import db here to avoid circular import issues if db is in __init__.py
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password) or not user.is_active:
        
       
         if user and not user.is_active:
            return jsonify({"error": "This account has been deactivated"}), 403
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
    """
    Get current authenticated user's details.
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
    responses:
      200:
        description: User details retrieved successfully.
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            email:
              type: string
              example: test@myduka.com
            role:
              type: string
              example: user
            store_id:
              type: integer
              nullable: true
              example: null
      401:
        description: Unauthorized, missing or invalid token.
        schema:
          type: object
          properties:
            msg:
              type: string
              example: Missing Authorization Header
      404:
        description: User not found.
        schema:
          type: object
          properties:
            error:
              type: string
              example: Not Found
    """
    from app import db # Import db here to avoid circular import issues if db is in __init__.py
    user_id = get_jwt_identity()
    # --- IMPORTANT: Cast get_jwt_identity() back to int for DB lookup ---
    user = User.query.get_or_404(int(user_id))
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
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
            - name
          properties:
            email:
              type: string
              format: email
              description: User's email address.
              example: newuser@example.com
            password:
              type: string
              format: password
              description: User's password (will be hashed).
              example: strong_password_123
            name:
              type: string
              description: User's full name.
              example: Jane Doe
            role:
              type: string
              description: User's role (e.g., "user", "merchant", "admin"). Defaults to "user".
              enum: ["user", "merchant", "admin"] # Example roles
              default: "user"
              example: user
            store_id:
              type: integer
              nullable: true
              description: Optional ID of the store the user is associated with.
              example: 1
    responses:
      201:
        description: User registered successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: User registered successfully
      400:
        description: Bad request, missing data or email already exists.
        schema:
          type: object
          properties:
            error:
              type: string
              example: Email already exists
    """
    from app import db # Import db here to avoid circular import issues if db is in __init__.py
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    name = data.get("name")
    role = data.get("role")
    store_id = data.get("store_id")

    if not email or not password or not name:
        return jsonify({"error": "Email, password, and name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    user = User(
        email=email,
        name=name,
        password=password,
        role=role or "user",
        store_id=store_id
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201