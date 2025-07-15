from flask import request, jsonify
from flask_jwt_extended import create_access_token
from app.models import User, db
from .utils import hash_password, verify_password
from http import HTTPStatus
from . import auth_bp

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), HTTPStatus.BAD_REQUEST

    user = User.query.filter_by(email=email).first()

    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "Invalid credentials"}), HTTPStatus.UNAUTHORIZED

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), HTTPStatus.FORBIDDEN

    access_token = create_access_token(identity=user.id)
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()
    }), HTTPStatus.OK

@auth_bp.route("/register", methods=["POST"])
def register():
    # Only allow registration if no users exist
    if User.query.first():
        return jsonify({"error": "Registration is only allowed for the first Merchant"}), HTTPStatus.FORBIDDEN

    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), HTTPStatus.BAD_REQUEST

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), HTTPStatus.CONFLICT

    hashed_pw = hash_password(password)
    new_user = User(email=email, password_hash=hashed_pw, role="merchant", is_active=True)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Merchant account created successfully",
        "user": new_user.to_dict()
    }), HTTPStatus.CREATED
