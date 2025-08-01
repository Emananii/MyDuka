from flask import Blueprint, jsonify, request
from datetime import datetime
from app.models import db, Purchase, PurchaseItem, Supplier, Product, StoreProduct, Store
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError

purchases_bp = Blueprint('purchases_bp', __name__)

@purchases_bp.route("/purchases", methods=["GET"])
def get_all_purchases():
    """
    Fetches all purchases with their related supplier information.
    """
    try:
        # Filter out soft-deleted purchases
        purchases = Purchase.query.filter(Purchase.is_deleted.is_(False)).order_by(Purchase.id.desc()).all()
        purchase_list = []
        for purchase in purchases:
            supplier_dict = {
                "id": purchase.supplier.id,
                "name": purchase.supplier.name
            } if purchase.supplier else None

            purchase_list.append({
                "id": purchase.id,
                "supplier": supplier_dict,
                "store_id": purchase.store_id, # Added store_id to the response
                "purchase_date": purchase.created_at.isoformat(),
                "notes": purchase.notes,
                "total_cost": sum(item.unit_cost * item.quantity for item in purchase.purchase_items),
            })
        return jsonify(purchase_list)
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@purchases_bp.route("/purchases/<int:id>", methods=["GET"])
def get_purchase_by_id(id):
    """
    Fetches a single purchase with its detailed purchase items.
    """
    purchase = Purchase.query.get_or_404(id)
    # Check if the purchase has been soft-deleted
    if purchase.is_deleted:
        return jsonify({"error": "Purchase not found"}), 404

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
    Creates a new purchase record and its associated purchase items, and updates
    the inventory (StoreProduct).
    """
    data = request.get_json()
    if not data or not all(key in data for key in ["supplier_id", "purchase_items", "store_id"]):
        return jsonify({"error": "Missing required fields: supplier_id, store_id, and purchase_items"}), 400

    try:
        new_purchase = Purchase(
            supplier_id=data["supplier_id"],
            store_id=data["store_id"],
            notes=data.get("notes")
        )
        db.session.add(new_purchase)
        db.session.flush()

        total_cost = 0

        for item_data in data["purchase_items"]:
            store_product = StoreProduct.query.filter_by(
                store_id=new_purchase.store_id,
                product_id=item_data["product_id"]
            ).first()

            if store_product:
                store_product.quantity_in_stock += item_data["quantity"]
                store_product.unit_cost = item_data["unit_cost"]
            else:
                store_product = StoreProduct(
                    store_id=new_purchase.store_id,
                    product_id=item_data["product_id"],
                    quantity_in_stock=item_data["quantity"],
                    unit_cost=item_data["unit_cost"]
                )
                db.session.add(store_product)

            new_item = PurchaseItem(
                purchase_id=new_purchase.id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                unit_cost=item_data["unit_cost"]
            )
            total_cost += new_item.quantity * new_item.unit_cost
            db.session.add(new_item)
            
        db.session.commit()
        
        new_purchase_dict = new_purchase.to_dict()
        new_purchase_dict["total_cost"] = total_cost

        return jsonify(new_purchase_dict), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@purchases_bp.route("/purchases/<int:id>", methods=["PATCH"])
def update_purchase(id):
    """
    Updates an existing purchase record, its items, and related inventory.
    This method performs a full replacement of the purchase items.
    """
    try:
        purchase = Purchase.query.get_or_404(id)

        # Do not allow updates to a soft-deleted purchase
        if purchase.is_deleted:
            return jsonify({"error": "Cannot update a deleted purchase"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update top-level purchase fields if they are in the request
        if "supplier_id" in data:
            purchase.supplier_id = data["supplier_id"]
        if "notes" in data:
            purchase.notes = data["notes"]
        # The store_id is also updatable
        if "store_id" in data:
            # Revert old inventory for the old store before changing store_id
            for item in purchase.purchase_items:
                store_product = StoreProduct.query.filter_by(
                    store_id=purchase.store_id,
                    product_id=item.product_id
                ).first()
                if store_product:
                    store_product.quantity_in_stock -= item.quantity
                    if store_product.quantity_in_stock < 0:
                        store_product.quantity_in_stock = 0
            purchase.store_id = data["store_id"]
        
        db.session.flush()

        # Handle purchase items update
        if "purchase_items" in data:
            # First, revert inventory for existing items and hard-delete them
            old_store_id = purchase.store_id if "store_id" in data else purchase.store_id

            for item in purchase.purchase_items:
                store_product = StoreProduct.query.filter_by(
                    store_id=old_store_id,
                    product_id=item.product_id
                ).first()
                if store_product:
                    store_product.quantity_in_stock -= item.quantity
                    if store_product.quantity_in_stock < 0:
                        store_product.quantity_in_stock = 0
                db.session.delete(item)
            db.session.flush()

            # Now, add the new items and update inventory
            for item_data in data["purchase_items"]:
                store_product = StoreProduct.query.filter_by(
                    store_id=purchase.store_id, # Use the new store_id
                    product_id=item_data["product_id"]
                ).first()
                
                if store_product:
                    store_product.quantity_in_stock += item_data["quantity"]
                    store_product.unit_cost = item_data["unit_cost"]
                else:
                    store_product = StoreProduct(
                        store_id=purchase.store_id,
                        product_id=item_data["product_id"],
                        quantity_in_stock=item_data["quantity"],
                        unit_cost=item_data["unit_cost"]
                    )
                    db.session.add(store_product)

                new_item = PurchaseItem(
                    purchase_id=purchase.id,
                    product_id=item_data["product_id"],
                    quantity=item_data["quantity"],
                    unit_cost=item_data["unit_cost"]
                )
                db.session.add(new_item)

        db.session.commit()
        
        # Re-fetch the purchase to get the new items
        db.session.refresh(purchase)

        # Calculate the total cost on the fly for the response
        total_cost = sum(item.unit_cost * item.quantity for item in purchase.purchase_items)

        purchase_data = {
            "id": purchase.id,
            "supplier": purchase.supplier.to_dict() if purchase.supplier else None,
            "store_id": purchase.store_id,
            "purchase_date": purchase.created_at.isoformat(),
            "notes": purchase.notes,
            "total_cost": total_cost,
            "purchase_items": [
                {
                    "id": item.id,
                    "product": item.product.to_dict() if item.product else None,
                    "quantity": item.quantity,
                    "unit_cost": str(item.unit_cost),
                    "total_item_cost": str(item.unit_cost * item.quantity),
                } for item in purchase.purchase_items
            ],
        }
        return jsonify(purchase_data), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@purchases_bp.route("/purchases/<int:id>", methods=["DELETE"])
def soft_delete_purchase(id):
    """
    Performs a soft delete on a purchase and its items, and reverts the inventory changes.
    """
    try:
        purchase = Purchase.query.get_or_404(id)

        if purchase.is_deleted:
            return jsonify({"error": "Purchase already deleted"}), 400

        # Mark the purchase as deleted
        purchase.is_deleted = True

        # Revert inventory changes and soft-delete purchase items
        for item in purchase.purchase_items:
            store_product = StoreProduct.query.filter_by(
                store_id=purchase.store_id,
                product_id=item.product_id
            ).first()

            if store_product:
                store_product.quantity_in_stock -= item.quantity
                if store_product.quantity_in_stock < 0:
                    # Optional: Handle negative stock if necessary
                    store_product.quantity_in_stock = 0

            item.is_deleted = True # Soft delete the purchase item

        db.session.commit()
        return jsonify({"message": f"Purchase {id} successfully soft-deleted"}), 200
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


@purchases_bp.route("/purchases/products", methods=["GET"])
def get_products_for_purchase():
    """
    Fetches all products with their related store product data for purchase.
    This endpoint is designed to be used by the AddPurchaseModal.
    """
    try:
        products = Product.query.options(joinedload(Product.store_products)).all()
        
        products_list = []
        for product in products:
            product_dict = {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "unit": product.unit,
                "description": product.description,
                "image_url": product.image_url,
                "category": product.category.name if product.category else None,
                "category_id": product.category_id,
                "created_at": product.created_at.isoformat() if product.created_at else None,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                "store_products": [
                    {
                        "id": sp.id,
                        "store_id": sp.store_id,
                        "unit_cost": str(sp.unit_cost),
                        "price": str(sp.price),
                        "quantity_in_stock": sp.quantity_in_stock,
                    } for sp in product.store_products
                ]
            }
            products_list.append(product_dict)
            
        return jsonify(products_list)
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@purchases_bp.route("/stores", methods=["GET"])
def get_stores():
    """
    Fetches a list of all stores for the frontend's dropdowns.
    """
    try:
        stores = Store.query.all()
        return jsonify([store.to_dict() for store in stores])
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500
