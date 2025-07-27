from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc
from app.models import SupplyRequest, User, Store, Product
from app.extensions import db

supply_bp = Blueprint('supply_bp', __name__, url_prefix='/api/supply-requests')

# Get supply requests (with filtering & pagination)
@supply_bp.route('/', methods=['GET'])
@jwt_required()
def get_requests():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    status = request.args.get('status')
    store_id = request.args.get('store_id')

    query = SupplyRequest.query

    if status:
        query = query.filter_by(status=status)
    if store_id:
        query = query.filter_by(store_id=store_id)

    results = query.order_by(desc(SupplyRequest.created_at)).paginate(page=page, per_page=per_page, error_out=False)

    data = []
    for req in results.items:
        data.append({
            "id": req.id,
            "store_id": req.store_id,
            "product_id": req.product_id,
            "quantity": req.quantity,
            "status": req.status,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
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
        })

    return jsonify(data), 200

# Create a new supply request
@supply_bp.route('/', methods=['POST'])
@jwt_required()
def create_request():
    data = request.get_json()
    user_id = get_jwt_identity()

    product_id = data.get('product_id')
    store_id = data.get('store_id')
    quantity = data.get('requested_quantity') or data.get('quantity')

    if not product_id or not store_id or not quantity:
        return jsonify({"error": "Missing required fields"}), 400

    new_request = SupplyRequest(
        store_id=store_id,
        product_id=product_id,
        quantity=quantity,
        status='pending'
    )

    db.session.add(new_request)
    db.session.commit()
    return jsonify({"message": "Supply request submitted"}), 201

# GET all supply requests
@supply_bp.route('/supply-requests', methods=['GET'])
@jwt_required()
def get_requests():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    status = request.args.get('status')
    store_id = request.args.get('store_id')

    query = SupplyRequest.query

    if status:
        query = query.filter_by(status=status)
    if store_id:
        query = query.filter_by(store_id=store_id)

    results = query.order_by(desc(SupplyRequest.id)).paginate(page=page, per_page=per_page, error_out=False)

    data = []
    for req in results.items:
        data.append({
            "id": req.id,
            "store": {"id": req.store.id, "name": req.store.name} if req.store else None,
            "product": {"id": req.product.id, "name": req.product.name} if req.product else None,
            "requested_quantity": req.requested_quantity,
            "status": req.status,
            "admin": {"id": req.admin.id, "name": req.admin.name} if req.admin else None,
            "admin_response": req.admin_response,
        })

    return jsonify({
        "data": data,
        "page": page,
        "total_pages": results.pages,
        "total": results.total
    }), 200

# POST new supply request
@supply_bp.route('/stores/<int:store_id>/supply-requests', methods=['POST'])
@jwt_required()
def create_request(store_id):
    user_id = get_jwt_identity()
    data = request.get_json()

    product_id = data.get("product_id")
    requested_quantity = data.get("requested_quantity")

    if not product_id or not requested_quantity:
        return jsonify({"error": "Missing required fields"}), 400

    new_request = SupplyRequest(
        store_id=store_id,
        product_id=product_id,
        requested_quantity=requested_quantity,
        status="pending",
        clerk_id=user_id
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({"message": "Supply request submitted"}), 201

# PATCH respond to request
@supply_bp.route('/stores/<int:store_id>/supply-requests/<int:request_id>/respond', methods=['PATCH'])
@jwt_required()
def respond_to_request(store_id, request_id):
    user_id = get_jwt_identity()
    req = SupplyRequest.query.get(request_id)

    if not req or req.store_id != store_id:
        return jsonify({"error": "Request not found"}), 404

    data = request.get_json()
    action = data.get("action")  # 'approve' or 'decline'
    comment = data.get("comment")

    if action not in ["approve", "decline"]:
        return jsonify({"error": "Invalid action"}), 400

    req.status = action
    req.admin_id = user_id
    req.admin_response = comment

    db.session.commit()

    return jsonify({"message": f"Request {action}d."}), 200

@jwt_required()
def create_request():
    data = request.get_json()
    user_id = get_jwt_identity()

    product_id = data.get('product_id')
    store_id = data.get('store_id')
    quantity = data.get('requested_quantity') or data.get('quantity')

    if not product_id or not store_id or not quantity:
        return jsonify({"error": "Missing required fields"}), 400

    new_request = SupplyRequest(
        store_id=store_id,
        product_id=product_id,
        quantity=quantity,
        status='pending'
    )

    db.session.add(new_request)
    db.session.commit()
    return jsonify({"message": "Supply request submitted"}), 201

# Approve a request
@supply_bp.route('/<int:request_id>/approve', methods=['PUT'])
@jwt_required()
def approve_request(request_id):
    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Request not found"}), 404

    req.status = 'approved'
    db.session.commit()
    return jsonify({"message": "Request approved"}), 200

# Decline a request
@supply_bp.route('/<int:request_id>/decline', methods=['PUT'])
@jwt_required()
def decline_request(request_id):
    req = SupplyRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Request not found"}), 404

    req.status = 'declined'
    db.session.commit()
    return jsonify({"message": "Request declined"}), 200

