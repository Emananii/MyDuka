# app/routes/merchant_routes.py

from flask import Blueprint, request, jsonify, abort
from app import db
from app.models import User, Store
from http import HTTPStatus
# Removed: from app.routes.user_routes import hash_password # No longer needed, User model handles hashing
from app.routes.user_routes import serialize_user # Keep serialize_user

merchants_api_bp = Blueprint("merchants_api", __name__, url_prefix="/api/merchants")

@merchants_api_bp.route("/", methods=["GET"])
def get_merchants():
    """
    Retrieves a list of all merchant users.
    ---
    tags:
      - Merchants
    responses:
      200:
        description: A list of merchant users.
        schema:
          type: array
          items:
            $ref: '#/definitions/User'
    """
    # In a real application, you'd add authentication and authorization checks here.
    # For now, assuming this is accessible for demonstration/admin purposes.

    merchants = User.query.filter_by(role="merchant", is_deleted=False).all()
    merchant_data = [serialize_user(merchant) for merchant in merchants]
    return jsonify(merchant_data), HTTPStatus.OK

@merchants_api_bp.route("", methods=["POST"]) # Handles /api/merchants
@merchants_api_bp.route("/", methods=["POST"]) # Handles /api/merchants/
def create_merchant():
    """
    Creates a new merchant user account.
    ---
    tags:
      - Merchants
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
            - email
            - password
          properties:
            name:
              type: string
            email:
              type: string
            password:
              type: string
            store_id:
              type: integer
              description: Optional store ID to associate with the merchant.
    responses:
      201:
        description: Merchant user created successfully.
        schema:
          $ref: '#/definitions/User'
      400:
        description: Missing data or invalid input.
      409:
        description: Email already exists.
    """
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    store_id = data.get("store_id") # Merchants can optionally be tied to a store

    if not all([name, email, password]):
        return jsonify({"error": "Missing name, email, or password"}), HTTPStatus.BAD_REQUEST

    if User.query.filter_by(email=email).first():
        abort(HTTPStatus.CONFLICT, description="Email already exists.")

    # Pass the plain text password directly to the 'password' property of the User model.
    # The User model's setter method (if correctly implemented) will handle hashing.
    new_merchant = User(
        name=name,
        email=email,
        password=password, # Pass the plain text password here
        role="merchant", # Explicitly set role to merchant
        store_id=store_id, # Optional
        is_active=True # Merchants are typically active upon creation
    )

    db.session.add(new_merchant)
    db.session.commit()

    return jsonify({
        "message": "Merchant user created successfully",
        "user": serialize_user(new_merchant)
    }), HTTPStatus.CREATED