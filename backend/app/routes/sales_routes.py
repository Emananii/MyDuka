from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from decimal import Decimal
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, func

from ..errors import BadRequestError, NotFoundError, InsufficientStockError, APIError

from ..models import db, Sale, SaleItem, Product, StoreProduct, User, Store

# Importing SalesService
from services.sales_services import SalesService

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

        # Call the service method to retrieve paginated sales
        paginated_sales = SalesService.get_all_sales(
            page=page,
            per_page=per_page,
            store_id=store_id,
            cashier_id=cashier_id
        )

        sales_list = []
        for sale in paginated_sales.items:
            sales_list.append({
                "id": sale.id,
                "store_id": sale.store_id,
                "cashier_id": sale.cashier_id,
                "payment_status": sale.payment_status,
                "total": float(sale.total), # Uses the hybrid property 'total'
                "sale_items": [
                    {
                        "store_product_id": item.store_product_id,
                        # Access product name via store_product relationship
                        "product_name": item.store_product.product.name if item.store_product and item.store_product.product else 'N/A',
                        "price_at_sale": float(item.price_at_sale),
                        "quantity": item.quantity
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

    except SQLAlchemyError:
        db.session.rollback() # Rollback in case of DB error
        raise # Let the global SQLAlchemyError handler catch this
    except Exception:
        db.session.rollback() # Rollback for any unexpected errors
        raise # Let the global generic Exception handler catch this


@sales_bp.route('/sales', methods=['POST'])
def create_sale():
    try:
        data = request.get_json()
        
        # Call the service method to handle sale creation logic
        new_sale = SalesService.create_sale(data)

        # If the service method completes without raising an exception, it's a success
        return jsonify({
            "message": "Sale created successfully",
            "sale_id": new_sale.id,
            "total": float(new_sale.total) # Access the hybrid property 'total'
        }), 201

    except SQLAlchemyError:
        db.session.rollback()
        raise # Re-raise to be caught by the global SQLAlchemyError handler
    except (BadRequestError, NotFoundError, InsufficientStockError): # Catch specific custom API errors
        db.session.rollback() # Ensure rollback for custom errors too
        raise # Re-raise to be caught by global handler
    except Exception:
        db.session.rollback()
        raise # Re-raise to be caught by the global generic Exception handler


@sales_bp.route('/sales/<int:id>', methods=['GET'])
def get_sale(id):
    try:
        # Call the service method to retrieve a single sale
        sale = SalesService.get_sale_by_id(id)

        # If sale is found, format and return the response
        return jsonify({
            "id": sale.id,
            "store_id": sale.store_id,
            "cashier_id": sale.cashier_id,
            "payment_status": sale.payment_status,
            "total": float(sale.total), # Uses the hybrid property 'total'
            "sale_items": [
                {
                    "store_product_id": item.store_product_id,
                    # Access product name via store_product relationship
                    "product_name": item.store_product.product.name if item.store_product and item.store_product.product else 'N/A',
                    "price_at_sale": float(item.price_at_sale),
                    "quantity": item.quantity
                }
                for item in sale.sale_items if not item.is_deleted
            ]
        }), 200

    except SQLAlchemyError:
        db.session.rollback()
        raise # Re-raise to be caught by the global SQLAlchemyError handler
    except NotFoundError: # Catch specific custom API errors
        db.session.rollback() # Ensure rollback for custom errors too
        raise # Re-raise to be caught by global handler
    except Exception:
        db.session.rollback()
        raise # Re-raise to be caught by the global generic Exception handler


@sales_bp.route('/sales/<int:id>', methods=['PATCH'])
def update_sale(id):
    try:
        data = request.get_json()

        # Call the service method to handle sale update logic
        updated_sale = SalesService.update_sale(id, data)
        
        return jsonify({
            "message": "Sale updated successfully",
            "id": updated_sale.id,
            "store_id": updated_sale.store_id,
            "cashier_id": updated_sale.cashier_id,
            "payment_status": updated_sale.payment_status,
            "total": float(updated_sale.total),
            "sale_items": [
                {
                    "id": item.id,
                    "store_product_id": item.store_product_id,
                    "product_name": item.store_product.product.name if item.store_product and item.store_product.product else 'N/A',
                    "price_at_sale": float(item.price_at_sale),
                    "quantity": item.quantity
                }
                for item in updated_sale.sale_items if not item.is_deleted
            ]
        }), 200

    except SQLAlchemyError:
        db.session.rollback()
        raise # Re-raise to be caught by the global SQLAlchemyError handler
    except (BadRequestError, NotFoundError, InsufficientStockError): # Catch specific custom API errors
        db.session.rollback() # Ensure rollback for custom errors too
        raise # Re-raise to be caught by global handler
    except Exception:
        db.session.rollback()
        raise # Re-raise to be caught by the global generic Exception handler


@sales_bp.route('/sales/<int:id>', methods=['DELETE'])
def delete_sale(id):
    try:
        # Call the service method to handle sale deletion logic
        SalesService.delete_sale(id)
        
        return jsonify({"message": f"Sale {id} deleted successfully"}), 200

    except SQLAlchemyError:
        db.session.rollback()
        raise # Re-raise to be caught by the global SQLAlchemyError handler
    except NotFoundError: # Catch specific custom API errors
        db.session.rollback() # Ensure rollback for custom errors too
        raise # Re-raise to be caught by global handler
    except Exception:
        db.session.rollback()
        raise # Re-raise to be caught by the global generic Exception handler
