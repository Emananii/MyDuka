# purchases_api.py

from flask import Blueprint, jsonify, request
from datetime import datetime
from app.models import db, Purchase, PurchaseItem, Supplier, Product # Assuming app.models is where your SQLAlchemy models are
from sqlalchemy.exc import SQLAlchemyError

purchases_bp = Blueprint('purchases_bp', __name__,)

@purchases_bp.route("/purchases", methods=["GET"])
def get_all_purchases():
    """
    Fetches all purchases with their related supplier information.

    The frontend expects a list of purchases to populate the main table.
    This route can also be filtered by a date range and supplier ID,
    which are handled by the frontend's filtering logic.
    """
    try:
        purchases = Purchase.query.order_by(Purchase.id.desc()).all()
        purchase_list = []
        for purchase in purchases:
            # The frontend expects a dictionary for the supplier,
            # so we manually serialize it.
            supplier_dict = {
                "id": purchase.supplier.id,
                "name": purchase.supplier.name
            } if purchase.supplier else None

            purchase_list.append({
                "id": purchase.id,
                "supplier": supplier_dict,
                "purchase_date": purchase.created_at.isoformat(),
                "notes": purchase.notes,
                "total_cost": sum(item.unit_cost * item.quantity for item in purchase.purchase_items),
                # This is the expected format from the frontend code
            })
        return jsonify(purchase_list)
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@purchases_bp.route("/purchases/<int:id>", methods=["GET"])
def get_purchase_by_id(id):
    """
    Fetches a single purchase with its detailed purchase items.

    This route is called by the frontend's ViewPurchaseModal to display
    all the details of a specific purchase.
    """
    purchase = Purchase.query.get_or_404(id)
    purchase_data = {
        "id": purchase.id,
        "supplier": purchase.supplier.to_dict() if purchase.supplier else None,
        "purchase_date": purchase.created_at.isoformat(),
        "notes": purchase.notes,
        "purchase_items": [
            {
                "id": item.id,
                "product": item.product.to_dict() if item.product else None,
                "quantity": item.quantity,
                "unit_cost": str(item.unit_cost),
                "total_item_cost": str(item.unit_cost * item.quantity),
            } for item in purchase.purchase_items
        ],
        "total_cost": sum(item.unit_cost * item.quantity for item in purchase.purchase_items)
    }
    return jsonify(purchase_data)


@purchases_bp.route("/purchases", methods=["POST"])
def create_purchase():
    """
    Creates a new purchase record and its associated purchase items.

    This route is triggered by the frontend's AddPurchaseModal.
    It expects a JSON payload with purchase details and a list of items.
    """
    data = request.get_json()
    if not data or not all(key in data for key in ["supplier_id", "purchase_items"]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        new_purchase = Purchase(
            supplier_id=data["supplier_id"],
            notes=data.get("notes")
        )
        db.session.add(new_purchase)
        db.session.commit()

        total_cost = 0

        for item_data in data["purchase_items"]:
            new_item = PurchaseItem(
                purchase_id=new_purchase.id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                unit_cost=item_data["unit_cost"]
            )
            total_cost += new_item.quantity * new_item.unit_cost
            db.session.add(new_item)
            
        db.session.commit()
        
        # A quick fix to add total_cost to the returned dictionary for now
        # Ideally, this would be a hybrid property on the model
        new_purchase_dict = new_purchase.to_dict()
        new_purchase_dict["total_cost"] = total_cost

        return jsonify(new_purchase_dict), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@purchases_bp.route("/suppliers", methods=["GET"])
def get_suppliers():
    """
    Fetches a list of all suppliers for the frontend's dropdowns.
    """
    suppliers = Supplier.query.all()
    return jsonify([supplier.to_dict() for supplier in suppliers])
