from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Store,StoreProduct,SupplyRequest,StockTransfer,StockTransferItem,Product,User,SupplyRequestStatus,StockTransferStatus
from app.routes.auth import role_required

store_bp = Blueprint("store", __name__, url_prefix="/api/store")

@store_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("merchant")
def create_store():
    data = request.get_json()
    if not data.get("name"):
        abort(400, "Store name required")
    store = Store(name=data["name"], address=data.get("address"))
    db.session.add(store)
    db.session.commit()
    return jsonify({"id": store.id, "name": store.name}), 201

@store_bp.route("/<int:store_id>", methods=["PATCH"])
@jwt_required()
@role_required("merchant")
def update_store(store_id):
    store = Store.query.get_or_404(store_id)
    data = request.get_json()
    if "name" in data:
        store.name = data["name"]
    if "address" in data:
        store.address = data["address"]
    db.session.commit()
    return jsonify({"message": "Store updated"})

@store_bp.route("/<int:store_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant")
def delete_store(store_id):
    store = Store.query.get_or_404(store_id)
    store.is_deleted = True
    db.session.commit()
    return jsonify({"message": "Store soft-deleted"})

@store_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin")
def list_stores():
    stores = Store.query.filter_by(is_deleted=False).all()
    return jsonify([{"id": s.id, "name": s.name, "address": s.address} for s in stores])

@store_bp.route("/<int:store_id>/invite", methods=["POST"])
@jwt_required()
@role_required("merchant", "admin")
def invite_user(store_id):
    store = Store.query.get_or_404(store_id)
    data = request.get_json()
    email = data.get("email")
    role = data.get("role")

    if not email or not role:
        abort(400, "Email and role are required")
    if role not in ("admin", "clerk", "cashier"):
        abort(400, "Invalid role")

    user = User(email=email, role=role, store_id=store.id, is_active=False)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": f"Invitation sent to {email}"}), 202


@store_bp.route("/<int:store_id>/supply-requests", methods=["POST"])
@jwt_required()
@role_required("clerk")
def create_supply_request(store_id):
    store = Store.query.get_or_404(store_id)
    data = request.get_json()
    product = Product.query.get_or_404(data.get("product_id"))
    req = SupplyRequest(
        store=store,
        product=product,
        clerk_id=get_jwt_identity(),
        requested_quantity=data.get("requested_quantity")
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"id": req.id, "status": req.status.value}), 201

@store_bp.route("/<int:store_id>/supply-requests/<int:req_id>/respond", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def respond_supply_request(store_id, req_id):
    req = SupplyRequest.query.filter_by(store_id=store_id, id=req_id).first_or_404()
    data = request.get_json()
    action = data.get("action")

    if action not in ("approve", "decline"):
        abort(400, "Invalid action")

    req.status = SupplyRequestStatus.approved if action == "approve" else SupplyRequestStatus.declined
    req.admin_id = get_jwt_identity()
    req.admin_response = data.get("comment")
    req.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"status": req.status.value})


@store_bp.route("/stock-transfers", methods=["POST"])
@jwt_required()
@role_required("admin")
def initiate_transfer():
    data = request.get_json()
    transfer = StockTransfer(
        from_store_id=data["from_store_id"],
        to_store_id=data["to_store_id"],
        initiated_by=get_jwt_identity(),
        notes=data.get("notes")
    )
    db.session.add(transfer)
    db.session.flush()

    for item in data.get("items", []):
        sti = StockTransferItem(
            stock_transfer_id=transfer.id,
            product_id=item["product_id"],
            quantity=item["quantity"]
        )
        db.session.add(sti)

    db.session.commit()
    return jsonify({"id": transfer.id, "status": transfer.status.value}), 201

@store_bp.route("/stock-transfers/<int:transfer_id>/approve", methods=["PATCH"])
@jwt_required()
@role_required("admin")
def approve_transfer(transfer_id):
    transfer = StockTransfer.query.get_or_404(transfer_id)
    if transfer.status != StockTransferStatus.pending:
        abort(400, "Transfer already processed")

    transfer.status = StockTransferStatus.approved
    transfer.approved_by = get_jwt_identity()
    transfer.transfer_date = datetime.utcnow()
    db.session.commit()
    return jsonify({"status": "approved"})
