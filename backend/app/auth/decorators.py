from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from app.models import User

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({"error": "Missing or invalid token"}), 401

            current_user = User.query.get(current_user_id)
            if not current_user or not current_user.is_active:
                return jsonify({"error": "User not found or inactive"}), 403

            if current_user.role not in roles:
                return jsonify({"error": "Unauthorized"}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator
