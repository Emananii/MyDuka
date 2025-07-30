# # app/services/sales_services.py
# print("DEBUG: Loading app/services/sales_services.py...")
# from sqlalchemy.exc import SQLAlchemyError
# from sqlalchemy.orm import joinedload
# from datetime import datetime, date
# from decimal import Decimal
# from sqlalchemy import desc, func, cast, Date


# # --- IMPORTANT CHANGE HERE ---
# # Instead of importing db and models directly, import the 'models' module
# # This helps prevent circular import issues when db is initialized in app.__init__
# import app.models as models # Renamed to 'models' for cleaner usage
# # --- END IMPORTANT CHANGE ---

# # Import your custom error classes (ensure this path is correct based on your setup)
# from app.errors import BadRequestError, NotFoundError, InsufficientStockError, APIError


# class SalesService:
#     print("DEBUG: Defining SalesService class.")
#     @staticmethod
#     def create_sale(data):
#         try:
#             store_id = data.get('store_id')
#             cashier_id = data.get('cashier_id')
#             payment_status = data.get('payment_status')
#             sale_items_data = data.get('sale_items')

#             if not all([store_id, cashier_id, payment_status, sale_items_data]):
#                 raise BadRequestError("Missing required fields for sale creation.")

#             # --- CHANGE: Reference models via 'models.' prefix ---
#             store = models.Store.query.filter_by(id=store_id, is_deleted=False).first()
#             if not store:
#                 raise NotFoundError(f"Store with ID {store_id} not found.")

#             cashier = models.User.query.filter_by(id=cashier_id, is_deleted=False).first()
#             if not cashier:
#                 raise NotFoundError(f"Cashier with ID {cashier_id} not found.")

#             new_sale = models.Sale(
#                 store_id=store_id,
#                 cashier_id=cashier_id,
#                 payment_status=payment_status
#             )
#             models.db.session.add(new_sale) # --- CHANGE: Reference db via 'models.db' ---
#             models.db.session.flush()

#             for item_data in sale_items_data:
#                 store_product_id = item_data.get('store_product_id')
#                 quantity = item_data.get('quantity')

#                 if not all([store_product_id, quantity is not None]):
#                     raise BadRequestError("Missing 'store_product_id' or 'quantity' in a sale item.")

#                 try:
#                     quantity = int(quantity)
#                     if quantity <= 0:
#                         raise BadRequestError("Quantity for a sale item must be positive.")
#                 except (ValueError, TypeError):
#                     raise BadRequestError("Quantity for a sale item must be a valid number.")

#                 store_product = models.StoreProduct.query.options(joinedload(models.StoreProduct.product))\
#                                                   .filter_by(id=store_product_id, store_id=store_id).first()

#                 if not store_product or store_product.is_deleted:
#                     raise NotFoundError(f"Store product with ID {store_product_id} not found or is deleted in store {store_id}.")
                
#                 if store_product.quantity_in_stock < quantity:
#                     raise InsufficientStockError(
#                         product_name=store_product.product.name,
#                         available_stock=store_product.quantity_in_stock,
#                         requested_quantity=quantity
#                     )

#                 store_product.quantity_in_stock -= quantity

#                 sale_item = models.SaleItem( # --- CHANGE: Reference models via 'models.' prefix ---
#                     sale_id=new_sale.id,
#                     store_product_id=store_product_id,
#                     quantity=quantity,
#                     price_at_sale=store_product.price
#                 )
#                 models.db.session.add(sale_item)

#             models.db.session.commit()
#             return new_sale

#         except SQLAlchemyError as e:
#             models.db.session.rollback()
#             raise APIError(f"Database error during sale creation: {str(e)}", status_code=500)
#         except APIError:
#             models.db.session.rollback()
#             raise
#         except Exception as e:
#             models.db.session.rollback()
#             raise APIError(f"An unexpected error occurred during sale creation: {str(e)}", status_code=500)

#     @staticmethod
#     def get_all_sales(page=1, per_page=10, store_id=None, cashier_id=None, search=None, start_date=None, end_date=None):
#         try:
#             query = models.Sale.query.options( # --- CHANGE: Reference models via 'models.' prefix ---
#                 joinedload(models.Sale.store),
#                 joinedload(models.Sale.cashier),
#                 joinedload(models.Sale.sale_items).joinedload(models.SaleItem.store_product).joinedload(models.StoreProduct.product)
#             ).filter_by(is_deleted=False)

#             if store_id:
#                 query = query.filter(models.Sale.store_id == store_id)
#             if cashier_id:
#                 query = query.filter(models.Sale.cashier_id == cashier_id)

#             if search:
#                 search_pattern = f"%{search}%"
#                 query = query.join(models.Sale.sale_items, isouter=True)\
#                              .join(models.SaleItem.store_product, isouter=True)\
#                              .join(models.StoreProduct.product, isouter=True)\
#                              .filter(
#                                  (models.Product.name.ilike(search_pattern)) | # --- CHANGE: Reference models via 'models.' prefix ---
#                                  (models.Sale.cashier.has(models.User.name.ilike(search_pattern))) |
#                                  (models.Sale.store.has(models.Store.name.ilike(search_pattern)))
#                              ).distinct()

#             if start_date:
#                 try:
#                     start_datetime = datetime.strptime(start_date, '%Y-%m-%d').date()
#                     query = query.filter(cast(models.Sale.created_at, Date) >= start_datetime) # --- CHANGE: Reference models via 'models.' prefix ---
#                 except ValueError:
#                     raise BadRequestError("Invalid start_date format. Use YYYY-MM-DD.")
            
#             if end_date:
#                 try:
#                     end_datetime = datetime.strptime(end_date, '%Y-%m-%d').date()
#                 except ValueError:
#                     raise BadRequestError("Invalid end_date format. Use YYYY-MM-DD.")
#             else:
#                 end_datetime = date.today()

#             query = query.filter(cast(models.Sale.created_at, Date) <= end_datetime) # --- CHANGE: Reference models via 'models.' prefix ---

#             query = query.order_by(models.Sale.created_at.desc()) # --- CHANGE: Reference models via 'models.' prefix ---
#             paginated_sales = query.paginate(page=page, per_page=per_page, error_out=False)
#             return paginated_sales
#         except SQLAlchemyError as e:
#             raise APIError(f"Database error retrieving sales: {str(e)}", status_code=500)
#         except BadRequestError:
#             raise
#         except Exception as e:
#             raise APIError(f"An unexpected error occurred retrieving sales: {str(e)}", status_code=500)

#     @staticmethod
#     def get_sale_by_id(sale_id):
#         try:
#             sale = models.Sale.query.options( # --- CHANGE: Reference models via 'models.' prefix ---
#                 joinedload(models.Sale.store),
#                 joinedload(models.Sale.cashier),
#                 joinedload(models.Sale.sale_items).joinedload(models.SaleItem.store_product).joinedload(models.StoreProduct.product)
#             ).filter_by(id=sale_id, is_deleted=False).first()

#             if not sale:
#                 raise NotFoundError(f"Sale with ID {sale_id} not found.")
#             return sale
#         except SQLAlchemyError as e:
#             raise APIError(f"Database error retrieving sale: {str(e)}", status_code=500)
#         except NotFoundError:
#             raise
#         except Exception as e:
#             raise APIError(f"An unexpected error occurred retrieving sale: {str(e)}", status_code=500)

#     @staticmethod
#     def update_sale(sale_id, data):
#         try:
#             sale = models.Sale.query.options( # --- CHANGE: Reference models via 'models.' prefix ---
#                 joinedload(models.Sale.sale_items).joinedload(models.SaleItem.store_product).joinedload(models.StoreProduct.product)
#             ).filter_by(id=sale_id, is_deleted=False).first()

#             if not sale:
#                 raise NotFoundError(f"Sale with ID {sale_id} not found.")

#             if 'cashier_id' in data:
#                 cashier = models.User.query.filter_by(id=data['cashier_id'], is_deleted=False).first()
#                 if not cashier:
#                     raise BadRequestError(f"Cashier with ID {data['cashier_id']} not found.")
#                 sale.cashier_id = data['cashier_id']

#             if 'payment_status' in data:
#                 if data['payment_status'] not in ['paid', 'unpaid']:
#                     raise BadRequestError("Invalid payment status. Must be 'paid' or 'unpaid'.")
#                 sale.payment_status = data['payment_status']

#             if 'sale_items' in data and isinstance(data['sale_items'], list):
#                 incoming_items = data['sale_items']
#                 existing_items_map = {item.id: item for item in sale.sale_items if not item.is_deleted}
#                 incoming_ids = set()

#                 for item_data in incoming_items:
#                     item_id = item_data.get('id')
#                     store_product_id = item_data.get('store_product_id')
#                     quantity = item_data.get('quantity')

#                     if item_id:
#                         if item_id in existing_items_map:
#                             existing_item = existing_items_map[item_id]
#                             incoming_ids.add(item_id)

#                             old_quantity = existing_item.quantity
#                             current_store_product = existing_item.store_product

#                             if store_product_id is not None and store_product_id != existing_item.store_product_id:
#                                 new_store_product = models.StoreProduct.query.options(joinedload(models.StoreProduct.product))\
#                                                                       .filter_by(id=store_product_id, store_id=sale.store_id).first()
#                                 if not new_store_product or new_store_product.is_deleted:
#                                     raise NotFoundError(f"New store product {store_product_id} not found or is deleted in store {sale.store_id}.")
                                
#                                 if current_store_product:
#                                     current_store_product.quantity_in_stock += old_quantity
                                
#                                 existing_item.store_product_id = store_product_id
#                                 existing_item.price_at_sale = new_store_product.price
#                                 current_store_product = new_store_product

#                             if quantity is not None:
#                                 try:
#                                     quantity = int(quantity)
#                                     if quantity < 0:
#                                         raise BadRequestError("Quantity must be non-negative for sale item update.")

#                                     if current_store_product:
#                                         stock_change = quantity - old_quantity
                                        
#                                         if current_store_product.quantity_in_stock - stock_change < 0:
#                                             raise InsufficientStockError(
#                                                 product_name=current_store_product.product.name,
#                                                 available_stock=current_store_product.quantity_in_stock + old_quantity,
#                                                 requested_quantity=quantity
#                                             )
#                                         current_store_product.quantity_in_stock -= stock_change
#                                         existing_item.quantity = quantity

#                                         if quantity == 0:
#                                             existing_item.is_deleted = True
#                                         else:
#                                             existing_item.is_deleted = False
#                                     else:
#                                         raise NotFoundError(f"Associated store product for sale item {existing_item.id} not found.")

#                                 except (ValueError, TypeError):
#                                     raise BadRequestError("Quantity must be a valid number for sale item update.")
#                         else:
#                             raise NotFoundError(f"Sale item with ID {item_id} not found in this sale or already deleted.")
#                     else:
#                         if not all([store_product_id, quantity is not None]):
#                             raise BadRequestError("Missing 'store_product_id' or 'quantity' for a new sale item.")

#                         try:
#                             quantity = int(quantity)
#                             if quantity <= 0:
#                                 raise BadRequestError("Quantity must be positive for new sale item.")
#                         except (ValueError, TypeError):
#                             raise BadRequestError("Quantity must be a valid number for new sale item.")

#                         store_product = models.StoreProduct.query.options(joinedload(models.StoreProduct.product))\
#                                                           .filter_by(id=store_product_id, store_id=sale.store_id).first()
#                         if not store_product or store_product.is_deleted:
#                             raise NotFoundError(f"Store product {store_product_id} not found or is deleted in store {sale.store_id}.")

#                         if store_product.quantity_in_stock < quantity:
#                             raise InsufficientStockError(
#                                 product_name=store_product.product.name,
#                                 available_stock=store_product.quantity_in_stock,
#                                 requested_quantity=quantity
#                             )

#                         new_item = models.SaleItem(
#                             sale_id=sale.id,
#                             store_product_id=store_product_id,
#                             quantity=quantity,
#                             price_at_sale=store_product.price,
#                         )
#                         models.db.session.add(new_item)
#                         store_product.quantity_in_stock -= quantity

#                 for existing_id, existing_item in existing_items_map.items():
#                     if existing_id not in incoming_ids:
#                         if not existing_item.is_deleted:
#                             associated_store_product = existing_item.store_product
#                             if associated_store_product:
#                                 associated_store_product.quantity_in_stock += existing_item.quantity
#                             existing_item.is_deleted = True
#                             existing_item.quantity = 0
#                             models.db.session.add(existing_item)

#             models.db.session.commit()
#             models.db.session.refresh(sale)
#             return sale

#         except SQLAlchemyError as e:
#             models.db.session.rollback()
#             raise APIError(f"Database error during sale update: {str(e)}", status_code=500)
#         except APIError:
#             models.db.session.rollback()
#             raise
#         except Exception as e:
#             models.db.session.rollback()
#             raise APIError(f"An unexpected error occurred during sale update: {str(e)}", status_code=500)

#     @staticmethod
#     def delete_sale(sale_id):
#         try:
#             sale = models.Sale.query.options(joinedload(models.Sale.sale_items).joinedload(models.SaleItem.store_product))\
#                              .filter_by(id=sale_id, is_deleted=False).first()
            
#             if not sale:
#                 raise NotFoundError(f"Sale with ID {sale_id} not found.")

#             sale.is_deleted = True
#             for item in sale.sale_items:
#                 if not item.is_deleted:
#                     store_product = item.store_product
#                     if store_product:
#                         store_product.quantity_in_stock += item.quantity
#                     item.is_deleted = True
#                     models.db.session.add(item)

#             models.db.session.commit()
#             return True

#         except SQLAlchemyError as e:
#             models.db.session.rollback()
#             raise APIError(f"Database error during sale deletion: {str(e)}", status_code=500)
#         except APIError:
#             models.db.session.rollback()
#             raise
#         except Exception as e:
#             models.db.session.rollback()
#             raise APIError(f"An unexpected error occurred during sale deletion: {str(e)}", status_code=500)