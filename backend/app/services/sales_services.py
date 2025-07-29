# services/sales_services.py

from datetime import datetime, date, timedelta
from sqlalchemy.orm import joinedload
# Import func, or_, and String for searching
from sqlalchemy import desc, func, or_, String
from decimal import Decimal  # Ensure Decimal is imported for calculations

# Make sure all necessary models are imported
from ..models import db, Sale, SaleItem, Product, StoreProduct, User, Store
# Ensure your custom errors are imported
from ..errors import NotFoundError, InsufficientStockError, BadRequestError


class SalesService:
    @staticmethod
    def get_all_sales_v2(page=1, per_page=10, store_id=None, cashier_id=None, search=None, start_date=None, end_date=None):
        # <--- THIS LINE IS INCLUDED FOR DEBUGGING
        # CORRECTED: Updated print statement to reflect the new function name
        print("**** Running get_all_sales_v2 from the LATEST VERSION (FORCED) ****")
        """
        Retrieves all sales with optional filters for store, cashier, search term, and date range.
        Includes eager loading for related data for efficient querying and serialization.
        """
        # Start with the base query, eager loading necessary relationships
        query = db.session.query(Sale).options(
            # Eager load cashier for name search and serialization
            joinedload(Sale.cashier),
            # Eager load store for name search and serialization
            joinedload(Sale.store),
            joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(
                StoreProduct.product)  # Eager load for product name search
        )

        # Apply optional store_id filter
        if store_id:
            query = query.filter(Sale.store_id == store_id)

        # Apply optional cashier_id filter
        if cashier_id:
            query = query.filter(Sale.cashier_id == cashier_id)

        # Apply Date Range Filters
        if start_date:
            # Ensure start_date is at the beginning of the day for inclusive filtering
            # The datetime object already comes from the route, just ensure time is 00:00:00
            start_date_at_start_of_day = datetime(
                start_date.year, start_date.month, start_date.day, 0, 0, 0)
            query = query.filter(Sale.sale_date >= start_date_at_start_of_day)

        if end_date:
            # Ensure end_date is at the end of the day for inclusive filtering
            # The datetime object already comes from the route, just ensure time is 23:59:59.999999
            end_date_at_end_of_day = datetime(
                end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999)
            query = query.filter(Sale.sale_date <= end_date_at_end_of_day)

        # Apply Search Term Filter
        if search: # CORRECTED: Changed 'search_term' to 'search' here
            search_pattern = f"%{search.lower()}%" # CORRECTED: Changed 'search_term.lower()' to 'search.lower()'
            query = query.filter(
                or_(
                    func.lower(Sale.payment_status).like(search_pattern),
                    # Search by cashier name (requires Sale.cashier relationship to User model)
                    func.lower(User.name).like(search_pattern),
                    # Search by store name (requires Sale.store relationship to Store model)
                    func.lower(Store.name).like(search_pattern),
                    # Search by product name within sale items (requires nested relationships)
                    Sale.sale_items.any(
                        SaleItem.store_product.has(
                            StoreProduct.product.has(
                                func.lower(Product.name).like(search_pattern)
                            )
                        )
                    ),
                    # Optional: Search by Sale ID (cast to string as it's an integer)
                    func.lower(func.cast(Sale.id, String)).like(search_pattern)
                )
            )
            # Add distinct to avoid duplicate sales if multiple sale items match
            query = query.distinct()

        # Order by sale_date descending for latest sales first
        query = query.order_by(desc(Sale.sale_date))

        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def create_sale(data):
        """
        Creates a new sale record and its associated sale items.
        Deducts stock from StoreProduct and calculates total sale amount.
        """
        store_id = data.get('store_id')
        cashier_id = data.get('cashier_id')
        payment_status = data.get('payment_status')
        sale_items_data = data.get('sale_items', [])  # Default to empty list

        if not store_id or not cashier_id or not sale_items_data:
            raise BadRequestError(
                "Missing store_id, cashier_id, or sale_items.")

        # Validate store and cashier existence
        # Use db.session.get for primary key lookup
        store = db.session.get(Store, store_id)
        if not store:
            raise NotFoundError(f"Store with ID {store_id} not found.")

        cashier = db.session.get(User, cashier_id)  # Use db.session.get
        if not cashier or cashier.role not in ['cashier', 'admin', 'clerk', 'merchant']:
            raise NotFoundError(
                f"Cashier with ID {cashier_id} not found or unauthorized role.")

        total_sale_amount = Decimal('0.00')
        new_sale_items_to_add = []  # Collect items to add after stock validation

        # Pre-validate stock and calculate total
        for item_data in sale_items_data:
            store_product_id = item_data.get('store_product_id')
            quantity_requested = item_data.get('quantity')
            price_at_sale = Decimal(
                str(item_data.get('price_at_sale')))  # Ensure Decimal

            if not store_product_id or not quantity_requested or price_at_sale is None:
                raise BadRequestError(
                    "Each sale item must have store_product_id, quantity, and price_at_sale.")
            if not isinstance(quantity_requested, (int, float)) or quantity_requested <= 0:
                raise BadRequestError("Quantity must be a positive number.")

            store_product = db.session.get(StoreProduct, store_product_id)
            if not store_product or store_product.store_id != store_id:  # Also check if product belongs to this store
                raise NotFoundError(
                    f"Product {store_product_id} not available or not found in store {store_id}.")

            if store_product.quantity_in_stock < quantity_requested:
                raise InsufficientStockError(
                    f"Insufficient stock for product '{store_product.product.name}'. Available: {store_product.quantity_in_stock}, Requested: {quantity_requested}")

            total_sale_amount += price_at_sale * quantity_requested

            new_sale_items_to_add.append({
                'store_product': store_product,  # Pass the object to avoid re-querying
                'quantity': quantity_requested,
                'price_at_sale': price_at_sale
            })

        new_sale = Sale(
            store_id=store_id,
            cashier_id=cashier_id,
            payment_status=payment_status,
            total=total_sale_amount,  # Assign the calculated total
            sale_date=datetime.now()  # Add the sale_date here
        )
        db.session.add(new_sale)
        db.session.flush()  # Flush to get new_sale.id before adding sale_items

        for item_info in new_sale_items_to_add:
            store_product = item_info['store_product']
            quantity = item_info['quantity']
            price_at_sale = item_info['price_at_sale']

            sale_item = SaleItem(
                sale_id=new_sale.id,
                store_product_id=store_product.id,
                quantity=quantity,
                price_at_sale=price_at_sale,
                total_price=price_at_sale * quantity  # Calculate total for item
            )
            db.session.add(sale_item)

            # Decrease stock
            store_product.quantity_in_stock -= quantity
            db.session.add(store_product)  # Mark as modified

        db.session.commit()
        return new_sale

    @staticmethod
    def get_sale_by_id(sale_id):
        """
        Retrieves a single sale by its ID, with eager loading of related details.
        """
        # Using db.session.get directly for primary key lookup, combined with options for eager loading
        sale = db.session.get(Sale, sale_id, options=[
            joinedload(Sale.cashier),
            joinedload(Sale.store),
            joinedload(Sale.sale_items).joinedload(
                SaleItem.store_product).joinedload(StoreProduct.product)
        ])

        if not sale:
            raise NotFoundError(f"Sale with ID {sale_id} not found.")
        return sale

    @staticmethod
    def update_sale(sale_id, data):
        """
        Updates an existing sale. Handles basic field updates and re-processing of sale items.
        Assumes 'sale_items' in data means a full replacement of existing items for simplicity.
        """
        sale = SalesService.get_sale_by_id(
            sale_id)  # Use the service method to get it with loads

        # Update simple fields if provided
        if 'store_id' in data:
            sale.store_id = data['store_id']
        if 'cashier_id' in data:
            sale.cashier_id = data['cashier_id']
        if 'payment_status' in data:
            sale.payment_status = data['payment_status']

        # Handle sale items update (this is a more complex logic, assuming replacement for now)
        if 'sale_items' in data:
            # First, restore stock for current items and delete them (soft delete or hard delete)
            for item in sale.sale_items:
                if not item.is_deleted:  # Only restore if not already marked as deleted
                    store_product = db.session.get(
                        StoreProduct, item.store_product_id)
                    if store_product:
                        store_product.quantity_in_stock += item.quantity
                db.session.delete(item)  # Hard delete old items

            sale.sale_items = []  # Clear the relationship collection

            total_sale_amount = Decimal('0.00')
            new_sale_items_to_add = []

            # Validate and prepare new items
            for item_data in data['sale_items']:
                store_product_id = item_data.get('store_product_id')
                quantity = item_data.get('quantity')
                price_at_sale = Decimal(str(item_data.get('price_at_sale')))

                if not store_product_id or not quantity or price_at_sale is None:
                    raise BadRequestError(
                        "Each new sale item must have store_product_id, quantity, and price_at_sale.")
                if not isinstance(quantity, (int, float)) or quantity <= 0:
                    raise BadRequestError(
                        "Quantity must be a positive number.")

                store_product = db.session.get(StoreProduct, store_product_id)
                # Ensure product belongs to the sale's store
                if not store_product or store_product.store_id != sale.store_id:
                    raise NotFoundError(
                        f"Product {store_product_id} not found or not available in sale's store.")

                if store_product.quantity_in_stock < quantity:
                    raise InsufficientStockError(
                        f"Insufficient stock for product '{store_product.product.name}'. Available: {store_product.quantity_in_stock}, Requested: {quantity}")

                total_sale_amount += price_at_sale * quantity
                new_sale_items_to_add.append({
                    'store_product': store_product,
                    'quantity': quantity,
                    'price_at_sale': price_at_sale
                })

            # Add new items and deduct stock
            for item_info in new_sale_items_to_add:
                store_product = item_info['store_product']
                quantity = item_info['quantity']
                price_at_sale = item_info['price_at_sale']

                new_item = SaleItem(
                    sale_id=sale.id,
                    store_product_id=store_product.id,
                    quantity=quantity,
                    price_at_sale=price_at_sale,
                    total_price=price_at_sale * quantity
                )
                db.session.add(new_item)
                store_product.quantity_in_stock -= quantity
                db.session.add(store_product)  # Mark as modified

            sale.total = total_sale_amount  # Update the sale's total based on new items

        db.session.commit()
        return sale

    @staticmethod
    def delete_sale(sale_id):
        """
        Performs a soft delete on a sale and its associated sale items.
        Restores stock for the items being 'deleted'.
        """
        sale = db.session.get(
            Sale, sale_id)  # Use get for direct primary key lookup
        if not sale:
            raise NotFoundError(f"Sale with ID {sale_id} not found.")

        # Restore stock for deleted items (only if not already marked as deleted)
        for item in sale.sale_items:
            if not item.is_deleted:
                store_product = db.session.get(
                    StoreProduct, item.store_product_id)
                if store_product:
                    store_product.quantity_in_stock += item.quantity
                item.is_deleted = True  # Mark sale item as deleted
                db.session.add(item)

        sale.is_deleted = True  # Assuming Sale model has is_deleted field for soft delete
        db.session.add(sale)
        db.session.commit()