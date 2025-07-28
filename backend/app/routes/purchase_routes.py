from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Purchase, PurchaseItem, Store, Product, User
from app.routes.auth_routes import role_required
from datetime import datetime

purchase_bp = Blueprint("purchase", __name__, url_prefix="/api/purchases/")

# Optional: respond to OPTIONS explicitly to satisfy preflight
@purchase_bp.route("/", methods=["OPTIONS"])
def purchases_options():
    return '', 204

@purchase_bp.route('/api/purchases/', methods=['GET'])
@jwt_required()
def get_purchases():
    user_id = get_jwt_identity()
    # ... logic using user_id
    return jsonify([...])


@purchase_bp.route("/", methods=["GET", "OPTIONS"])
@jwt_required()
@role_required(["clerk", "admin"])
def list_all_purchases():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    purchases = Purchase.query.filter_by(store_id=user.store_id).all()
    return jsonify([p.to_dict() for p in purchases]), 200

# Create a new purchase with items
@purchase_bp.route("/create", methods=["POST"])
@jwt_required()
@role_required(["clerk", "admin"])
def create_purchase():
    data = request.get_json() or {}
    store_id = data.get("store_id")
    supplier_id = data.get("supplier_id")
    reference_number = data.get("reference_number")
    date_str = data.get("date")
    notes = data.get("notes")
    items = data.get("items", [])  # List of dicts: [{product_id, quantity, unit_cost}, ...]

    if not store_id or not supplier_id or not items:
        abort(400, description="Missing required fields.")

    try:
        purchase_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        purchase_date = datetime.utcnow().date()

    purchase = Purchase(
        store_id=store_id,
        supplier_id=supplier_id,
        reference_number=reference_number,
        date=purchase_date,
        notes=notes
    )
    db.session.add(purchase)
    db.session.flush()  # Get purchase.id

    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity")
        unit_cost = item.get("unit_cost")
        if not all([product_id, quantity, unit_cost]):
            continue
        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=product_id,
            quantity=quantity,
            unit_cost=unit_cost
        )
        db.session.add(purchase_item)

    db.session.commit()
    return jsonify({"message": "Purchase recorded", "purchase_id": purchase.id}), 201


# List purchases (Admin only)
@purchase_bp.route("/list", methods=["GET"])
@jwt_required()
@role_required(["admin", "clerk", "merchant", "cashier"])
def list_purchases():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    purchases = Purchase.query.filter_by(store_id=user.store_id).all()
    return jsonify([p.to_dict() for p in purchases]), 200

# View single purchase
@purchase_bp.route("/<int:purchase_id>", methods=["GET"])
@jwt_required()
@role_required(["clerk", "admin"])
def get_purchase(purchase_id):
    purchase = Purchase.query.get_or_404(purchase_id)
    result = purchase.to_dict()
    result["items"] = [item.to_dict() for item in purchase.purchase_items]
    return jsonify(result), 200

# Mark purchase as paid
@purchase_bp.route("/<int:purchase_id>/pay", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def pay_purchase(purchase_id):
    purchase = Purchase.query.get_or_404(purchase_id)
    purchase.is_paid = True
    db.session.commit()
    return jsonify({"message": "Purchase marked as paid."}), 200