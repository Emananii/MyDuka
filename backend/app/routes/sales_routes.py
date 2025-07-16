from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from decimal import Decimal

from ..models import db, Sale, SaleItem, Product, StoreProduct, User, Store

sales_bp = Blueprint('sales_bp', __name__)

@sales_bp.route('/sales', methods=['POST'])
def create_sale():
    try:
        data = request.get_json()

        # Extract and validate core sale data
        store_id = data.get('store_id')
        cashier_id = data.get('cashier_id')
        items = data.get('items')  # Expecting list of { product_id, quantity }

        if not store_id or not cashier_id or not items:
            return jsonify({'error': 'store_id, cashier_id, and items are required'}), 400

        total = Decimal("0.00")
        sale_items = []

        for item in items:
            product_id = item.get('product_id')
            quantity = item.get('quantity')

            if not product_id or not quantity:
                return jsonify({'error': 'Each item must include product_id and quantity'}), 400

            # Look up StoreProduct
            store_product = StoreProduct.query.filter_by(store_id=store_id, product_id=product_id).first()
            if not store_product:
                return jsonify({'error': f'Product {product_id} not found in store {store_id}'}), 404

            if store_product.quantity_in_stock < quantity:
                return jsonify({'error': f'Not enough stock for product {product_id}'}), 400

            # Price is not in StoreProduct – so we assume a fixed price from Product table or external logic
            product = Product.query.get(product_id)
            price = Decimal("100.00")  # You might use a real field like product.price

            # Update stock
            store_product.quantity_in_stock -= quantity

            # Accumulate total
            subtotal = price * quantity
            total += subtotal

            sale_item = SaleItem(product_id=product_id, quantity=quantity, price_at_sale=price)
            sale_items.append(sale_item)

        sale = Sale(store_id=store_id, cashier_id=cashier_id, total_amount=total, payment_status='paid')
        db.session.add(sale)
        db.session.flush()  # Ensures `sale.id` is available

        for item in sale_items:
            item.sale_id = sale.id
            db.session.add(item)

        db.session.commit()

        return jsonify(sale.to_dict()), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
