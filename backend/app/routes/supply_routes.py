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
    status = request.args.get('status')  # 'pending', 'approved', 'declined'
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
            "updated_at": req.updated_at
        })

    return jsonify({
        "data": data,
        "page": page,
        "total_pages": results.pages,
        "total": results.total
    }), 200

# Create a new supply request
@supply_bp.route('/', methods=['POST'])
@jwt_required()
def create_request():
    data = request.get_json()
    user_id = get_jwt_identity()

    product_id = data.get('product_id')
    store_id = data.get('store_id')
    quantity = data.get('quantity')

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
