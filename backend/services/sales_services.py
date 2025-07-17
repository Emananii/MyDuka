from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from datetime import datetime
from decimal import Decimal

# Import your models
from app.models import db, Sale, SaleItem, Product, StoreProduct, User, Store # Added Store and User

# Import your custom error classes
from app.errors import BadRequestError, NotFoundError, InsufficientStockError, APIError


class SalesService:

    @staticmethod
    def create_sale(data):
        """
        Creates a new sale and its associated sale items, updating product stock.

        Args:
            data (dict): A dictionary containing sale details:
                         - 'store_id': ID of the store where the sale occurred.
                         - 'cashier_id': ID of the user (cashier) who made the sale.
                         - 'payment_status': 'paid' or 'unpaid'.
                         - 'sale_items': A list of dictionaries, each with:
                                         - 'store_product_id': ID of the StoreProduct being sold.
                                         - 'quantity': Quantity of the product sold.

        Returns:
            Sale: The newly created Sale object.

        Raises:
            BadRequestError: If required fields are missing or data is invalid.
            NotFoundError: If store, cashier, or store product is not found.
            InsufficientStockError: If there's not enough stock for a product.
            SQLAlchemyError: For database-related errors.
            Exception: For any unexpected errors.
        """
        try:
            store_id = data.get('store_id')
            cashier_id = data.get('cashier_id')
            payment_status = data.get('payment_status')
            sale_items_data = data.get('sale_items')

            if not all([store_id, cashier_id, payment_status, sale_items_data]):
                raise BadRequestError("Missing required fields for sale creation.")

            # Validate store and cashier existence
            store = Store.query.filter_by(id=store_id, is_deleted=False).first()
            if not store:
                raise NotFoundError(f"Store with ID {store_id} not found.")

            cashier = User.query.filter_by(id=cashier_id, is_deleted=False).first()
            if not cashier:
                raise NotFoundError(f"Cashier with ID {cashier_id} not found.")

            # Create the Sale record
            new_sale = Sale(
                store_id=store_id,
                cashier_id=cashier_id,
                payment_status=payment_status
            )
            db.session.add(new_sale)
            db.session.flush()  # Assigns an ID to new_sale before committing

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

                # Find the StoreProduct to get price and check stock
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

                # Deduct stock
                store_product.quantity_in_stock -= quantity

                # Create SaleItem
                sale_item = SaleItem(
                    sale_id=new_sale.id,
                    store_product_id=store_product_id,
                    quantity=quantity,
                    price_at_sale=store_product.price # Use the price from StoreProduct at the time of sale
                )
                db.session.add(sale_item)

            db.session.commit()
            return new_sale

        except SQLAlchemyError as e:
            db.session.rollback()
            raise APIError(f"Database error during sale creation: {str(e)}", status_code=500)
        except APIError: # Catch and re-raise custom API errors
            db.session.rollback() # Ensure rollback for custom errors too
            raise
        except Exception as e:
            db.session.rollback()
            raise APIError(f"An unexpected error occurred during sale creation: {str(e)}", status_code=500)

    @staticmethod
    def get_all_sales(page=1, per_page=10, store_id=None, cashier_id=None):
        """
        Retrieves a paginated list of sales, with optional filters.

        Args:
            page (int): The page number for pagination.
            per_page (int): The number of items per page.
            store_id (int, optional): Filter sales by store ID.
            cashier_id (int, optional): Filter sales by cashier ID.

        Returns:
            Pagination: A Flask-SQLAlchemy Pagination object containing Sale records.

        Raises:
            SQLAlchemyError: For database-related errors.
            Exception: For any unexpected errors.
        """
        try:
            query = Sale.query.options(
                joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
            ).filter_by(is_deleted=False)

            if store_id:
                query = query.filter(Sale.store_id == store_id)
            if cashier_id:
                query = query.filter(Sale.cashier_id == cashier_id)

            query = query.order_by(Sale.created_at.desc())
            paginated_sales = query.paginate(page=page, per_page=per_page, error_out=False)
            return paginated_sales
        except SQLAlchemyError as e:
            raise APIError(f"Database error retrieving sales: {str(e)}", status_code=500)
        except Exception as e:
            raise APIError(f"An unexpected error occurred retrieving sales: {str(e)}", status_code=500)

    @staticmethod
    def get_sale_by_id(sale_id):
        """
        Retrieves a single sale by its ID, with its associated sale items.

        Args:
            sale_id (int): The ID of the sale to retrieve.

        Returns:
            Sale: The Sale object if found.

        Raises:
            NotFoundError: If the sale is not found.
            SQLAlchemyError: For database-related errors.
            Exception: For any unexpected errors.
        """
        try:
            sale = Sale.query.options(
                joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
            ).filter_by(id=sale_id, is_deleted=False).first()

            if not sale:
                raise NotFoundError(f"Sale with ID {sale_id} not found.")
            return sale
        except SQLAlchemyError as e:
            raise APIError(f"Database error retrieving sale: {str(e)}", status_code=500)
        except Exception as e:
            raise APIError(f"An unexpected error occurred retrieving sale: {str(e)}", status_code=500)

    @staticmethod
    def update_sale(sale_id, data):
        """
        Updates an existing sale and its sale items, adjusting product stock.

        Args:
            sale_id (int): The ID of the sale to update.
            data (dict): A dictionary containing update details.
                         Can include 'cashier_id', 'payment_status', 'sale_items'.
                         'sale_items' is a list of dicts, each with:
                           - 'id' (optional): ID of existing SaleItem to update.
                           - 'store_product_id': ID of the StoreProduct.
                           - 'quantity': New quantity.

        Returns:
            Sale: The updated Sale object.

        Raises:
            NotFoundError: If the sale or associated resources are not found.
            BadRequestError: If input data is invalid.
            InsufficientStockError: If stock is insufficient for updates.
            SQLAlchemyError: For database-related errors.
            Exception: For any unexpected errors.
        """
        try:
            sale = Sale.query.options(
                joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
            ).filter_by(id=sale_id, is_deleted=False).first()

            if not sale:
                raise NotFoundError(f"Sale with ID {sale_id} not found.")

            # 1. Update cashier
            if 'cashier_id' in data:
                cashier = User.query.filter_by(id=data['cashier_id'], is_deleted=False).first()
                if not cashier:
                    raise BadRequestError(f"Cashier with ID {data['cashier_id']} not found.")
                sale.cashier_id = data['cashier_id']

            # 2. Update payment status
            if 'payment_status' in data:
                if data['payment_status'] not in ['paid', 'unpaid']:
                    raise BadRequestError("Invalid payment status. Must be 'paid' or 'unpaid'.")
                sale.payment_status = data['payment_status']

            # 3. Update SaleItems
            if 'sale_items' in data and isinstance(data['sale_items'], list):
                incoming_items = data['sale_items']
                existing_items_map = {item.id: item for item in sale.sale_items if not item.is_deleted}
                incoming_ids = set()

                for item_data in incoming_items:
                    item_id = item_data.get('id')
                    store_product_id = item_data.get('store_product_id')
                    quantity = item_data.get('quantity')

                    if item_id:
                        # Update existing sale item
                        if item_id in existing_items_map:
                            existing_item = existing_items_map[item_id]
                            incoming_ids.add(item_id)

                            old_quantity = existing_item.quantity
                            current_store_product = existing_item.store_product

                            # If store_product_id changes
                            if store_product_id is not None and store_product_id != existing_item.store_product_id:
                                new_store_product = StoreProduct.query.options(joinedload(StoreProduct.product))\
                                                                      .filter_by(id=store_product_id, store_id=sale.store_id).first()
                                if not new_store_product or new_store_product.is_deleted:
                                    raise NotFoundError(f"New store product {store_product_id} not found or is deleted in store {sale.store_id}.")
                                
                                # Return old quantity to old product's stock
                                if current_store_product:
                                    current_store_product.quantity_in_stock += old_quantity
                                
                                existing_item.store_product_id = store_product_id
                                existing_item.price_at_sale = new_store_product.price
                                current_store_product = new_store_product # Update reference for quantity check

                            # Update quantity
                            if quantity is not None:
                                try:
                                    quantity = int(quantity)
                                    if quantity <= 0:
                                        raise BadRequestError("Quantity must be positive for sale item update.")

                                    if current_store_product:
                                        stock_change = quantity - old_quantity
                                        if current_store_product.quantity_in_stock - stock_change < 0:
                                            raise InsufficientStockError(
                                                current_store_product.product.name,
                                                current_store_product.quantity_in_stock + old_quantity, # Available before this item's change
                                                quantity
                                            )
                                        current_store_product.quantity_in_stock -= stock_change
                                        existing_item.quantity = quantity
                                    else:
                                        raise NotFoundError(f"Associated store product for sale item {existing_item.id} not found.")

                                except (ValueError, TypeError):
                                    raise BadRequestError("Quantity must be a valid number for sale item update.")
                        else:
                            raise NotFoundError(f"Sale item with ID {item_id} not found in this sale or already deleted.")
                    else:
                        # Add new SaleItem
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
                            raise InsufficientStockError(store_product.product.name, store_product.quantity_in_stock, quantity)

                        new_item = SaleItem(
                            sale_id=sale.id,
                            store_product_id=store_product_id,
                            quantity=quantity,
                            price_at_sale=store_product.price,
                        )
                        db.session.add(new_item)
                        store_product.quantity_in_stock -= quantity

                # Soft-delete sale items that were removed in the request
                for existing_id, existing_item in existing_items_map.items():
                    if existing_id not in incoming_ids:
                        associated_store_product = existing_item.store_product
                        if associated_store_product:
                            associated_store_product.quantity_in_stock += existing_item.quantity
                        existing_item.is_deleted = True

            db.session.commit()
            db.session.refresh(sale) # Refresh to ensure hybrid properties like 'total' are updated
            return sale

        except SQLAlchemyError as e:
            db.session.rollback()
            raise APIError(f"Database error during sale update: {str(e)}", status_code=500)
        except APIError: # Catch and re-raise custom API errors
            db.session.rollback()
            raise
        except Exception as e:
            db.session.rollback()
            raise APIError(f"An unexpected error occurred during sale update: {str(e)}", status_code=500)

    @staticmethod
    def delete_sale(sale_id):
        """
        Soft-deletes a sale and its associated sale items, returning quantities to stock.

        Args:
            sale_id (int): The ID of the sale to delete.

        Returns:
            bool: True if the sale was successfully soft-deleted.

        Raises:
            NotFoundError: If the sale is not found.
            SQLAlchemyError: For database-related errors.
            Exception: For any unexpected errors.
        """
        try:
            # Eager load sale_items and their store_products to ensure stock can be returned
            sale = Sale.query.options(joinedload(Sale.sale_items).joinedload(SaleItem.store_product))\
                             .filter_by(id=sale_id, is_deleted=False).first()
            
            if not sale:
                raise NotFoundError(f"Sale with ID {sale_id} not found.")

            sale.is_deleted = True
            for item in sale.sale_items:
                item.is_deleted = True  # soft-delete related sale_items
                # Return quantity to stock
                store_product = item.store_product
                if store_product:
                    store_product.quantity_in_stock += item.quantity

            db.session.commit()
            return True

        except SQLAlchemyError as e:
            db.session.rollback()
            raise APIError(f"Database error during sale deletion: {str(e)}", status_code=500)
        except APIError: # Catch and re-raise custom API errors
            db.session.rollback()
            raise
        except Exception as e:
            db.session.rollback()
            raise APIError(f"An unexpected error occurred during sale deletion: {str(e)}", status_code=500)