from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from decimal import Decimal
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, func


from ..models import db, Sale, SaleItem, Product, StoreProduct, User, Store

sales_bp = Blueprint('sales_bp', __name__)

@sales_bp.route('/sales', methods=['GET'])
def get_sales():
    try:
        # pagination params
        page = request.args.get('page', default=1, type=int)
        per_page = request.args.get('per_page', default=10, type=int)

        # optional filters
        store_id = request.args.get('store_id', type=int)
        cashier_id = request.args.get('cashier_id', type=int)

        query = Sale.query.options(joinedload(Sale.sale_items)).filter_by(is_deleted=False)

        if store_id:
            query = query.filter(Sale.store_id == store_id)
        if cashier_id:
            query = query.filter(Sale.cashier_id == cashier_id)

        # order by newest
        query = query.order_by(desc(Sale.created_at))

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        sales_list = []
        for sale in paginated.items:
            sales_list.append({
                "id": sale.id,
                "store_id": sale.store_id,
                "cashier_id": sale.cashier_id,
                "payment_status": sale.payment_status,
                "total": float(sale.total),
                "sale_items": [
                    {
                        "product_id": item.product_id,
                        "name": item.product_name,
                        "price": float(item.price),
                        "quantity": item.quantity
                    }
                    for item in sale.sale_items if not item.is_deleted
                ]
            })

        return jsonify({
            "sales": sales_list,
            "total": paginated.total,
            "page": paginated.page,
            "pages": paginated.pages,
            "per_page": paginated.per_page
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@sales_bp.route('/sales', methods=['POST'])
def create_sale():
    try:
        data = request.get_json()

        store_id = data.get('store_id')
        cashier_id = data.get('cashier_id')
        payment_status = data.get('payment_status')
        sale_items_data = data.get('sale_items')  # list of {product_id, quantity}

        if not all([store_id, cashier_id, payment_status, sale_items_data]):
            return jsonify({"error": "Missing required fields"}), 400

        # Create the Sale
        new_sale = Sale(store_id=store_id, cashier_id=cashier_id, payment_status=payment_status)
        db.session.add(new_sale)
        db.session.flush()  # Generate sale.id before creating sale items

        for item in sale_items_data:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)

            # Find store product for price and name
            store_product = StoreProduct.query.filter_by(store_id=store_id, product_id=product_id).first()
            if not store_product:
                return jsonify({"error": f"Product {product_id} not found in store {store_id}"}), 404

            sale_item = SaleItem(
                sale_id=new_sale.id,
                product_id=product_id,
                quantity=quantity,
                price=store_product.price,
                product_name=store_product.product.name  # denormalized name
            )
            db.session.add(sale_item)

        db.session.commit()

        return jsonify({
            "message": "Sale created",
            "sale_id": new_sale.id,
            "total": float(new_sale.total)
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@sales_bp.route('/sales/<int:id>', methods=['GET'])
def get_sale(id):
    try:
        sale = Sale.query.options(joinedload(Sale.sale_items)).filter_by(id=id, is_deleted=False).first()

        if not sale:
            return jsonify({"error": "Sale not found"}), 404

        return jsonify({
            "id": sale.id,
            "store_id": sale.store_id,
            "cashier_id": sale.cashier_id,
            "payment_status": sale.payment_status,
            "total": float(sale.total),
            "sale_items": [
                {
                    "product_id": item.product_id,
                    "name": item.product_name,
                    "price": float(item.price),
                    "quantity": item.quantity
                }
                for item in sale.sale_items if not item.is_deleted
            ]
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from decimal import Decimal

from ..models import db, Sale, SaleItem, Product, StoreProduct, User

@sales_bp.route('/sales/<int:id>', methods=['PATCH'])
def update_sale(id):
    data = request.get_json()

    sale = Sale.query.options(joinedload(Sale.sale_items)).filter_by(id=id, is_deleted=False).first()
    if not sale:
        return jsonify({"error": "Sale not found"}), 404

    try:
        # 1. Update cashier
        if 'cashier_id' in data:
            cashier = User.query.filter_by(id=data['cashier_id'], is_deleted=False).first()
            if not cashier:
                return jsonify({"error": "Cashier not found"}), 400
            sale.cashier_id = data['cashier_id']

        # 2. Update payment status
        if 'payment_status' in data:
            if data['payment_status'] not in ['paid', 'unpaid']:
                return jsonify({"error": "Invalid payment status"}), 400
            sale.payment_status = data['payment_status']

        # 3. Update SaleItems
        if 'sale_items' in data and isinstance(data['sale_items'], list):
            incoming_items = data['sale_items']
            existing_items = {item.id: item for item in sale.sale_items if not item.is_deleted}
            incoming_ids = set()

            for item_data in incoming_items:
                item_id = item_data.get('id')

                # Update existing sale item
                if item_id and item_id in existing_items:
                    existing_item = existing_items[item_id]
                    incoming_ids.add(item_id)

                    if 'product_id' in item_data:
                        product = Product.query.filter_by(id=item_data['product_id'], is_deleted=False).first()
                        if not product:
                            return jsonify({"error": f"Product {item_data['product_id']} not found"}), 400
                        existing_item.product_id = item_data['product_id']

                    if 'quantity' in item_data:
                        try:
                            quantity = int(item_data['quantity'])
                            if quantity <= 0:
                                return jsonify({"error": "Quantity must be positive"}), 400
                            existing_item.quantity = quantity
                        except (ValueError, TypeError):
                            return jsonify({"error": "Quantity must be a number"}), 400

                else:
                    # Add new SaleItem
                    try:
                        product_id = item_data['product_id']
                        quantity = int(item_data['quantity'])

                        product = Product.query.filter_by(id=product_id, is_deleted=False).first()
                        if not product:
                            return jsonify({"error": f"Product {product_id} not found"}), 400

                        new_item = SaleItem(
                            sale_id=sale.id,
                            product_id=product_id,
                            quantity=quantity
                        )
                        db.session.add(new_item)

                    except (KeyError, ValueError, TypeError):
                        return jsonify({"error": "Invalid sale item structure"}), 400

            # Soft-delete sale items that were removed in the request
            for existing_id, existing_item in existing_items.items():
                if existing_id not in incoming_ids:
                    existing_item.is_deleted = True

        # 4. Recalculate total_amount from all non-deleted sale_items
        total = Decimal(0)
        for item in sale.sale_items:
            if not item.is_deleted:
                product = Product.query.filter_by(id=item.product_id, is_deleted=False).first()
                if product:
                    total += product.price * item.quantity
        sale.total_amount = total

        db.session.commit()
        return jsonify(sale.to_dict()), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@sales_bp.route('/sales/<int:id>', methods=['DELETE'])
def delete_sale(id):
    sale = Sale.query.filter_by(id=id, is_deleted=False).first()
    if not sale:
        return jsonify({"error": "Sale not found"}), 404

    try:
        sale.is_deleted = True
        for item in sale.sale_items:
            item.is_deleted = True  # soft-delete related sale_items

        db.session.commit()
        return jsonify({"message": f"Sale {id} deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
