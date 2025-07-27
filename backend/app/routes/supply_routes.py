from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import desc
from app.models import SupplyRequest, User, Store, Product
from app import db
from datetime import datetime

supply_bp = Blueprint('supply_bp', __name__, url_prefix='/api/supply-requests')

# Route 1: GET all supply requests (with filtering, sorting, pagination)
# Handles: GET /api/supply-requests?status=<status>&store_id=<id>&page=<num>&per_page=<num>
@supply_bp.route('/', methods=['GET'])
# @jwt_required() # Removed authorization for testing
def get_all_supply_requests():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    status = request.args.get('status')
    store_id = request.args.get('store_id')

    query = SupplyRequest.query

    if status:
        query = query.filter_by(status=status)
    if store_id:
        try:
            query = query.filter_by(store_id=int(store_id))
        except ValueError:
            return jsonify({"error": "Invalid store_id"}), 400

    results = query.order_by(desc(SupplyRequest.id)).paginate(page=page, per_page=per_page, error_out=False)

    data = []
    for req in results.items:
        data.append({
            "id": req.id,
            "store_id": req.store_id,
            "product_id": req.product_id,
            "requested_quantity": req.quantity,
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "updated_at": req.updated_at.isoformat() if req.updated_at else None,
            "product": {
                "id": req.product.id,
                "name": req.product.name
            } if req.product else None,
            "store": {
                "id": req.store.id,
                "name": req.store.name
            } if req.store else None,
            "admin_response": req.admin_response,
            "admin": {
                "id": req.admin.id,
                "name": req.admin.name
            } if req.admin else None,
            "clerk": {
                "id": req.clerk.id,
                "name": req.clerk.name
            } if req.clerk else None,
        })

    return jsonify({
        "data": data,
        "page": results.page,
        "total_pages": results.pages,
        "total": results.total
    }), 200

# Route 2: GET a single supply request by ID
# Handles: GET /api/supply-requests/<request_id>
@supply_bp.route('/<int:request_id>', methods=['GET'])
# @jwt_required() # Removed authorization for testing
def get_single_supply_request(request_id):
    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Supply request not found"}), 404

    return jsonify({
        "id": req.id,
        "store_id": req.store_id,
        "product_id": req.product_id,
        "requested_quantity": req.quantity,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "product": {
            "id": req.product.id,
            "name": req.product.name
        } if req.product else None,
        "store": {
            "id": req.store.id,
            "name": req.store.name
        } if req.store else None,
        "admin_response": req.admin_response,
        "admin": {
            "id": req.admin.id,
            "name": req.admin.name
        } if req.admin else None,
        "clerk": {
            "id": req.clerk.id,
            "name": req.clerk.name
        } if req.clerk else None,
    }), 200

# Route 3: POST new supply request (typically from clerk)
# Handles: POST /api/supply-requests/create
@supply_bp.route('/create', methods=['POST'])
# @jwt_required() # Removed authorization for testing
def create_supply_request():
    user_id = get_jwt_identity() # Still need identity for clerk_id, but not enforced by JWT for now
    data = request.get_json()

    product_id = data.get("product_id")
    store_id = data.get("store_id")
    requested_quantity = data.get("requested_quantity")

    if not product_id or not store_id or not requested_quantity:
        return jsonify({"error": "Missing required fields: product_id, store_id, requested_quantity"}), 400

    new_request = SupplyRequest(
        store_id=store_id,
        product_id=product_id,
        quantity=requested_quantity,
        status="pending",
        clerk_id=user_id # Associate with the clerk who created it
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({"message": "Supply request submitted", "request_id": new_request.id}), 201

# Route 4: PATCH respond to a supply request (admin/merchant action)
# Handles: PATCH /api/supply-requests/<request_id>/respond
@supply_bp.route('/<int:request_id>/respond', methods=['PATCH'])
# @jwt_required() # Removed authorization for testing
def respond_to_supply_request(request_id):
    admin_id = get_jwt_identity() # Still need identity for admin_id, but not enforced by JWT for now
    req = SupplyRequest.query.get(request_id)

    if not req:
        return jsonify({"error": "Supply request not found"}), 404

    data = request.get_json()
    action = data.get("action")
    comment = data.get("comment")

    if action not in ["approve", "decline"]:
        return jsonify({"error": "Invalid action"}), 400

    req.status = action
    req.admin_id = admin_id
    req.admin_response = comment
    req.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({"message": f"Request {action}d.", "request": {
        "id": req.id,
        "status": req.status,
        "admin_id": req.admin_id,
        "admin_response": req.admin_response
    }}), 200
