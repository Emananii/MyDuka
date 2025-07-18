from functools import wraps
from flask import Blueprint, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
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

            if user is None or not user.is_active or user.role not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return JWT token.
    Expected JSON:
        { "email": "user@example.com", "password": "your_password" }
    """
    from app import db
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
    from app import db 
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    Expected JSON:
        { "name": "Your Name", "email": "your_email@example.com", "password": "your_secure_password", "role": "merchant", "store_name": "Your Store Name" }
    """
    from app import db
    from app.models import Store
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    role = data.get("role")

  
    if not all([name, email, password, role]):
        return jsonify({"error": "Name, email, password, and role are required"}), 400

    
    if role.lower() != 'merchant':
        return jsonify({"error": "Public registration is only available for new merchants."}), 403

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    store_name = data.get("store_name")
    if not store_name:
        return jsonify({"error": "A store_name is required for merchant registration"}), 400

    try:
       
        new_store = Store(name=store_name)
        db.session.add(new_store)
        db.session.flush() 

        new_merchant = User(
            name=name,
            email=email,
            password=password,
            role='merchant',
            store_id=new_store.id 
        )
        db.session.add(new_merchant)
        db.session.commit()
    except Exception as e:
        db.session.rollback() 
       
        return jsonify({"error": "An internal error occurred during registration."}), 500

    return jsonify({"message": "Merchant and store registered successfully"}), 201