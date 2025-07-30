# app/routes/sales_routes.py

from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload # Now needed here for eager loading
from datetime import datetime, date # Now needed here for date parsing
from decimal import Decimal # Now needed here for total calculation (if Decimal is preferred for totals)
from sqlalchemy import desc, func, cast, Date # Now needed here for filtering/ordering

# Import ALL necessary models and db from app.models
# Make sure app.models.py imports db as `from app import db`
from app.models import db, Sale, SaleItem, Product, StoreProduct, User, Store

# Import ALL necessary error classes
from app.errors import BadRequestError, NotFoundError, InsufficientStockError, APIError


sales_bp = Blueprint('sales_bp', __name__)

@sales_bp.route('/sales', methods=['GET'])
def get_sales():
    try:
        page = request.args.get('page', default=1, type=int)
        per_page = request.args.get('per_page', default=10, type=int)

        store_id_param = request.args.get('store_id')
        store_id = int(store_id_param) if store_id_param and store_id_param.isdigit() else None

        cashier_id_param = request.args.get('cashier_id')
        cashier_id = int(cashier_id_param) if cashier_id_param and cashier_id_param.isdigit() else None
        
        search_query_param = request.args.get('search', type=str)
        search_query = search_query_param if search_query_param and search_query_param.lower() != 'undefined' else None

        start_date_param = request.args.get('start_date', type=str)
        start_date = start_date_param if start_date_param and start_date_param.lower() != 'undefined' else None

        end_date_param = request.args.get('end_date', type=str)
        end_date = end_date_param if end_date_param and end_date_param.lower() != 'undefined' else None

        # --- SalesService.get_all_sales logic moved here ---
        query = Sale.query.options( # Use Sale directly
            joinedload(Sale.store),
            joinedload(Sale.cashier),
            joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
        ).filter_by(is_deleted=False)

        if store_id:
            query = query.filter(Sale.store_id == store_id)
        if cashier_id:
            query = query.filter(Sale.cashier_id == cashier_id)

        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.join(Sale.sale_items, isouter=True)\
                         .join(SaleItem.store_product, isouter=True)\
                         .join(StoreProduct.product, isouter=True)\
                         .filter(
                             (Product.name.ilike(search_pattern)) |
                             (Sale.cashier.has(User.name.ilike(search_pattern))) |
                             (Sale.store.has(Store.name.ilike(search_pattern)))
                         ).distinct()

        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(cast(Sale.created_at, Date) >= start_datetime)
            except ValueError:
                raise BadRequestError("Invalid start_date format. Use YYYY-MM-DD.")
        
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                raise BadRequestError("Invalid end_date format. Use YYYY-MM-DD.")
        else:
            end_datetime = date.today()

        query = query.filter(cast(Sale.created_at, Date) <= end_datetime)

        query = query.order_by(Sale.created_at.desc())
        paginated_sales = query.paginate(page=page, per_page=per_page, error_out=False)
        # --- End SalesService.get_all_sales logic ---

        sales_list = []
        for sale in paginated_sales.items:
            sales_list.append({
                "id": sale.id,
                "store_id": sale.store_id,
                "cashier_id": sale.cashier_id,
                "payment_status": sale.payment_status,
                "created_at": sale.created_at.isoformat() if sale.created_at else None,
                "total": float(sale.total),
                "cashier": {
                    "name": sale.cashier.name
                } if sale.cashier else None,
                "store": {
                    "name": sale.store.name
                } if sale.store else None,
                "sale_items": [
                    {
                        "product_id": item.store_product_id,
                        "product_name": item.store_product.product.name if item.store_product and item.store_product.product else 'N/A',
                        "price": float(item.price_at_sale),
                        "quantity": item.quantity,
                        "unit": item.store_product.product.unit if item.store_product and item.store_product.product else None,
                        "subtotal": float(item.price_at_sale * item.quantity)
                    }
                    for item in sale.sale_items if not item.is_deleted
                ]
            })

        return jsonify({
            "sales": sales_list,
            "total": paginated_sales.total,
            "page": paginated_sales.page,
            "pages": paginated_sales.pages,
            "per_page": paginated_sales.per_page
        }), 200

    except BadRequestError as e:
        print(f"Bad Request Error in get_sales: {e.message}")
        return jsonify({"error": e.message}), e.status_code
    except SQLAlchemyError as e:
        print(f"SQLAlchemy Error in get_sales: {e}")
        return jsonify({"error": "Database error occurred while fetching sales."}), 500
    except Exception as e:
        print(f"Unexpected Error in get_sales: {e}")
        return jsonify({"error": "An unexpected error occurred while fetching sales."}), 500


@sales_bp.route('/sales', methods=['POST'])
def create_sale():
    try:
        data = request.get_json()
        
        # --- SalesService.create_sale logic moved here ---
        store_id = data.get('store_id')
        cashier_id = data.get('cashier_id')
        payment_status = data.get('payment_status')
        sale_items_data = data.get('sale_items')

        if not all([store_id, cashier_id, payment_status, sale_items_data]):
            raise BadRequestError("Missing required fields for sale creation.")

        store = Store.query.filter_by(id=store_id, is_deleted=False).first()
        if not store:
            raise NotFoundError(f"Store with ID {store_id} not found.")

        cashier = User.query.filter_by(id=cashier_id, is_deleted=False).first()
        if not cashier:
            raise NotFoundError(f"Cashier with ID {cashier_id} not found.")

        new_sale = Sale(
            store_id=store_id,
            cashier_id=cashier_id,
            payment_status=payment_status
        )
        db.session.add(new_sale)
        db.session.flush() # Use flush to get new_sale.id before commit

        for item_data in sale_items_data:
            store_product_id = item_data.get('store_product_id')
            quantity = item_data.get('quantity')

            if not all([store_product_id, quantity is not None]):
                raise BadRequestError("Missing 'store_product_id' or 'quantity' in a sale item.")

            try:
                quantity = int(quantity)
                if quantity <= 0:
                    raise BadRequestError("Quantity for a sale item must be positive.")
            except (ValueError, TypeError):
                raise BadRequestError("Quantity for a sale item must be a valid number.")

            store_product = StoreProduct.query.options(joinedload(StoreProduct.product))\
                                              .filter_by(id=store_product_id, store_id=store_id).first()

            if not store_product or store_product.is_deleted:
                raise NotFoundError(f"Store product with ID {store_product_id} not found or is deleted in store {store_id}.")
            
            if store_product.quantity_in_stock < quantity:
                raise InsufficientStockError(
                    product_name=store_product.product.name,
                    available_stock=store_product.quantity_in_stock,
                    requested_quantity=quantity
                )

            store_product.quantity_in_stock -= quantity

            sale_item = SaleItem(
                sale_id=new_sale.id,
                store_product_id=store_product_id,
                quantity=quantity,
                price_at_sale=store_product.price
            )
            db.session.add(sale_item)

        db.session.commit()
        # --- End SalesService.create_sale logic ---

        return jsonify({
            "message": "Sale created successfully",
            "sale_id": new_sale.id,
            "total": float(new_sale.total)
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback() # Rollback explicitly here
        print(f"SQLAlchemy Error in create_sale: {e}")
        raise APIError("Database error occurred during sale creation.", 500)
    except (BadRequestError, NotFoundError, InsufficientStockError) as e:
        db.session.rollback() # Rollback explicitly here
        raise e
    except Exception as e:
        db.session.rollback() # Rollback explicitly here
        print(f"Unexpected Error in create_sale: {e}")
        raise APIError("An unexpected error occurred during sale creation.", 500)


@sales_bp.route('/sales/<int:id>', methods=['GET'])
def get_sale(id):
    try:
        # --- SalesService.get_sale_by_id logic moved here ---
        sale = Sale.query.options(
            joinedload(Sale.store),
            joinedload(Sale.cashier),
            joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
        ).filter_by(id=id, is_deleted=False).first()

        if not sale:
            raise NotFoundError(f"Sale with ID {id} not found.")
        # --- End SalesService.get_sale_by_id logic ---

        return jsonify({
            "id": sale.id,
            "created_at": sale.created_at.isoformat() if sale.created_at else None,
            "payment_status": sale.payment_status,
            "total": float(sale.total),
            "cashier": {
                "name": sale.cashier.name
            } if sale.cashier else None,
            "store": {
                "name": sale.store.name
            } if sale.store else None,
            "sale_items": [
                {
                    "product_id": item.store_product_id,
                    "product_name": item.store_product.product.name if item.store_product and item.store_product.product else 'N/A',
                    "quantity": item.quantity,
                    "price": float(item.price_at_sale),
                    "unit": item.store_product.product.unit if item.store_product and item.store_product.product else None,
                    "subtotal": float(item.price_at_sale * item.quantity)
                }
                for item in sale.sale_items if not item.is_deleted
            ]
        }), 200

    except SQLAlchemyError as e:
        print(f"SQLAlchemy Error in get_sale: {e}")
        raise APIError("Database error occurred while fetching sale details.", 500)
    except NotFoundError as e:
        raise e
    except Exception as e:
        print(f"Unexpected Error in get_sale: {e}")
        raise APIError("An unexpected error occurred while fetching sale details.", 500)


@sales_bp.route('/sales/<int:id>', methods=['PATCH'])
def update_sale(id):
    try:
        data = request.get_json()

        # --- SalesService.update_sale logic moved here ---
        sale = Sale.query.options(
            joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
        ).filter_by(id=id, is_deleted=False).first()

        if not sale:
            raise NotFoundError(f"Sale with ID {id} not found.")

        if 'cashier_id' in data:
            cashier = User.query.filter_by(id=data['cashier_id'], is_deleted=False).first()
            if not cashier:
                raise BadRequestError(f"Cashier with ID {data['cashier_id']} not found.")
            sale.cashier_id = data['cashier_id']

        if 'payment_status' in data:
            if data['payment_status'] not in ['paid', 'unpaid']:
                raise BadRequestError("Invalid payment status. Must be 'paid' or 'unpaid'.")
            sale.payment_status = data['payment_status']

        if 'sale_items' in data and isinstance(data['sale_items'], list):
            incoming_items = data['sale_items']
            existing_items_map = {item.id: item for item in sale.sale_items if not item.is_deleted}
            incoming_ids = set()

            for item_data in incoming_items:
                item_id = item_data.get('id')
                store_product_id = item_data.get('store_product_id')
                quantity = item_data.get('quantity')

                if item_id:
                    if item_id in existing_items_map:
                        existing_item = existing_items_map[item_id]
                        incoming_ids.add(item_id)

                        old_quantity = existing_item.quantity
                        current_store_product = existing_item.store_product

                        if store_product_id is not None and store_product_id != existing_item.store_product_id:
                            new_store_product = StoreProduct.query.options(joinedload(StoreProduct.product))\
                                                                  .filter_by(id=store_product_id, store_id=sale.store_id).first()
                            if not new_store_product or new_store_product.is_deleted:
                                raise NotFoundError(f"New store product {store_product_id} not found or is deleted in store {sale.store_id}.")
                            
                            if current_store_product:
                                current_store_product.quantity_in_stock += old_quantity
                            
                            existing_item.store_product_id = store_product_id
                            existing_item.price_at_sale = new_store_product.price
                            current_store_product = new_store_product

                        if quantity is not None:
                            try:
                                quantity = int(quantity)
                                if quantity < 0:
                                    raise BadRequestError("Quantity must be non-negative for sale item update.")

                                if current_store_product:
                                    stock_change = quantity - old_quantity
                                    
                                    if current_store_product.quantity_in_stock - stock_change < 0:
                                        raise InsufficientStockError(
                                            product_name=current_store_product.product.name,
                                            available_stock=current_store_product.quantity_in_stock + old_quantity,
                                            requested_quantity=quantity
                                        )
                                    current_store_product.quantity_in_stock -= stock_change
                                    existing_item.quantity = quantity

                                    if quantity == 0:
                                        existing_item.is_deleted = True
                                    else:
                                        existing_item.is_deleted = False
                                else:
                                    raise NotFoundError(f"Associated store product for sale item {existing_item.id} not found.")

                            except (ValueError, TypeError):
                                raise BadRequestError("Quantity must be a valid number for sale item update.")
                    else:
                        raise NotFoundError(f"Sale item with ID {item_id} not found in this sale or already deleted.")
                else:
                    if not all([store_product_id, quantity is not None]):
                        raise BadRequestError("Missing 'store_product_id' or 'quantity' for a new sale item.")

                    try:
                        quantity = int(quantity)
                        if quantity <= 0:
                            raise BadRequestError("Quantity must be positive for new sale item.")
                    except (ValueError, TypeError):
                        raise BadRequestError("Quantity must be a valid number for new sale item.")

                    store_product = StoreProduct.query.options(joinedload(StoreProduct.product))\
                                                      .filter_by(id=store_product_id, store_id=sale.store_id).first()
                    if not store_product or store_product.is_deleted:
                        raise NotFoundError(f"Store product {store_product_id} not found or is deleted in store {sale.store_id}.")

                    if store_product.quantity_in_stock < quantity:
                        raise InsufficientStockError(
                            product_name=store_product.product.name,
                            available_stock=store_product.quantity_in_stock,
                            requested_quantity=quantity
                        )

                    new_item = SaleItem(
                        sale_id=sale.id,
                        store_product_id=store_product_id,
                        quantity=quantity,
                        price_at_sale=store_product.price,
                    )
                    db.session.add(new_item)
                    store_product.quantity_in_stock -= quantity

            for existing_id, existing_item in existing_items_map.items():
                if existing_id not in incoming_ids:
                    if not existing_item.is_deleted:
                        associated_store_product = existing_item.store_product
                        if associated_store_product:
                            associated_store_product.quantity_in_stock += existing_item.quantity
                        existing_item.is_deleted = True
                        existing_item.quantity = 0
                        db.session.add(existing_item)

        db.session.commit()
        db.session.refresh(sale)
        updated_sale = sale # Assign for clarity, though 'sale' is already updated
        # --- End SalesService.update_sale logic ---
        
        return jsonify({
            "message": "Sale updated successfully",
            "id": updated_sale.id,
            "store_id": updated_sale.store_id,
            "cashier_id": updated_sale.cashier_id,
            "payment_status": updated_sale.payment_status,
            "created_at": updated_sale.created_at.isoformat() if updated_sale.created_at else None,
            "total": float(updated_sale.total),
            "sale_items": [
                {
                    "id": item.id,
                    "store_product_id": item.store_product_id,
                    "product_name": item.store_product.product.name if item.store_product and item.store_product.product else 'N/A',
                    "price": float(item.price_at_sale),
                    "quantity": item.quantity,
                    "subtotal": float(item.price_at_sale * item.quantity)
                }
                for item in updated_sale.sale_items if not item.is_deleted
            ]
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback() # Rollback explicitly here
        print(f"SQLAlchemy Error in update_sale: {e}")
        raise APIError("Database error occurred during sale update.", 500)
    except (BadRequestError, NotFoundError, InsufficientStockError) as e:
        db.session.rollback() # Rollback explicitly here
        raise e
    except Exception as e:
        db.session.rollback() # Rollback explicitly here
        print(f"Unexpected Error in update_sale: {e}")
        raise APIError("An unexpected error occurred during sale update.", 500)


@sales_bp.route('/sales/<int:id>', methods=['DELETE'])
def delete_sale(id):
    try:
        # --- SalesService.delete_sale logic moved here ---
        sale = Sale.query.options(joinedload(Sale.sale_items).joinedload(SaleItem.store_product))\
                         .filter_by(id=id, is_deleted=False).first()
        
        if not sale:
            raise NotFoundError(f"Sale with ID {id} not found.")

        sale.is_deleted = True
        for item in sale.sale_items:
            if not item.is_deleted:
                store_product = item.store_product
                if store_product:
                    store_product.quantity_in_stock += item.quantity
                item.is_deleted = True
                db.session.add(item)

        db.session.commit()
        # --- End SalesService.delete_sale logic ---
        
        return jsonify({"message": f"Sale {id} deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback() # Rollback explicitly here
        print(f"SQLAlchemy Error in delete_sale: {e}")
        raise APIError("Database error occurred during sale deletion.", 500)
    except NotFoundError as e:
        db.session.rollback() # Rollback explicitly here
        raise e
    except Exception as e:
        db.session.rollback() # Rollback explicitly here
        print(f"Unexpected Error in delete_sale: {e}")
        raise APIError("An unexpected error occurred during sale deletion.", 500)