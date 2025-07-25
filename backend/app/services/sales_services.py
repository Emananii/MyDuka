# services/sales_services.py (MODIFIED)

from sqlalchemy.orm import joinedload
from ..models import db, Sale, SaleItem, StoreProduct, Product # Make sure these models are imported correctly
from ..errors import NotFoundError, InsufficientStockError # Ensure your custom errors are imported

class SalesService:
    @staticmethod
    def get_all_sales(page, per_page, store_id=None, cashier_id=None):
        query = db.session.query(Sale).options(
            joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
        )
        if store_id:
            query = query.filter(Sale.store_id == store_id)
        if cashier_id:
            query = query.filter(Sale.cashier_id == cashier_id)
        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def create_sale(data):
        # Your existing create_sale logic (likely doesn't need changes related to the current error)
        # This method likely creates the Sale and SaleItem records
        # and should not be the source of the population error for GET requests.
        # ... (Your existing creation logic here)
        from decimal import Decimal
        from ..models import StoreProduct, Product # Ensure these are imported here if needed
        from ..errors import BadRequestError, InsufficientStockError

        store_id = data.get('store_id')
        cashier_id = data.get('cashier_id')
        sale_items_data = data.get('sale_items', [])

        if not store_id or not cashier_id or not sale_items_data:
            raise BadRequestError("Missing store_id, cashier_id, or sale_items.")

        total_sale_amount = Decimal('0.00')
        new_sale_items = []
        
        # Verify stock and calculate total
        for item_data in sale_items_data:
            store_product_id = item_data.get('store_product_id')
            quantity_requested = item_data.get('quantity')
            price_at_sale = Decimal(str(item_data.get('price_at_sale'))) # Ensure Decimal for calculations

            if not store_product_id or not quantity_requested or price_at_sale is None:
                raise BadRequestError("Each sale item must have store_product_id, quantity, and price_at_sale.")
            
            store_product = db.session.query(StoreProduct).filter_by(id=store_product_id).first()
            if not store_product:
                raise NotFoundError(f"Store Product with ID {store_product_id} not found.")

            if store_product.quantity_in_stock < quantity_requested:
                raise InsufficientStockError(f"Insufficient stock for product '{store_product.product.name}'. Available: {store_product.quantity_in_stock}, Requested: {quantity_requested}")
            
            total_sale_amount += price_at_sale * quantity_requested
            
            # Create a SaleItem instance (but don't add to session yet)
            new_sale_items.append(SaleItem(
                store_product_id=store_product_id,
                quantity=quantity_requested,
                price_at_sale=price_at_sale
            ))

        new_sale = Sale(
            store_id=store_id,
            cashier_id=cashier_id,
            payment_status=data.get('payment_status', 'pending'), # Default to 'pending'
            total=total_sale_amount # Assign the calculated total
        )
        db.session.add(new_sale)
        db.session.flush() # Flush to get new_sale.id before adding sale_items

        for item in new_sale_items:
            item.sale_id = new_sale.id # Link to the new sale
            db.session.add(item)
            # Decrease stock
            store_product = db.session.query(StoreProduct).filter_by(id=item.store_product_id).first()
            if store_product:
                store_product.quantity_in_stock -= item.quantity
        
        db.session.commit()
        return new_sale

    @staticmethod
    def get_sale_by_id(sale_id):
        # THIS IS THE PRIMARY FIX FOR YOUR ERROR
        sale = db.session.query(Sale).options(
            # Eager load sale_items
            joinedload(Sale.sale_items).
            # Then eager load store_product for each sale_item
            joinedload(SaleItem.store_product).
            # Then eager load product for each store_product
            joinedload(StoreProduct.product)
        ).filter(Sale.id == sale_id).first()

        if not sale:
            raise NotFoundError(f"Sale with ID {sale_id} not found.")
        return sale

    @staticmethod
    def update_sale(sale_id, data):
        # Similarly, if you want full details with sale_items on update,
        # you might need joinedload here as well, if your update logic
        # involves re-fetching the sale after update.
        sale = db.session.query(Sale).options(
            joinedload(Sale.sale_items).joinedload(SaleItem.store_product).joinedload(StoreProduct.product)
        ).filter(Sale.id == sale_id).first()

        if not sale:
            raise NotFoundError(f"Sale with ID {sale_id} not found.")

        # Update fields
        sale.store_id = data.get('store_id', sale.store_id)
        sale.cashier_id = data.get('cashier_id', sale.cashier_id)
        sale.payment_status = data.get('payment_status', sale.payment_status)
        # Update sale items if provided
        if 'sale_items' in data:
            # This logic can be complex: deleting old items, adding new ones, updating existing
            # For simplicity, here's a basic approach that assumes new data replaces old
            # You might need a more sophisticated diffing logic for production
            for item in sale.sale_items:
                if not item.is_deleted:
                    # Restore stock for deleted items
                    store_product = db.session.query(StoreProduct).filter_by(id=item.store_product_id).first()
                    if store_product:
                        store_product.quantity_in_stock += item.quantity
                    db.session.delete(item)
            sale.sale_items = [] # Clear old items

            total_sale_amount = Decimal('0.00')
            for item_data in data['sale_items']:
                store_product_id = item_data.get('store_product_id')
                quantity = item_data.get('quantity')
                price_at_sale = Decimal(str(item_data.get('price_at_sale')))

                if not store_product_id or not quantity or price_at_sale is None:
                    raise BadRequestError("Each sale item must have store_product_id, quantity, and price_at_sale.")

                store_product = db.session.query(StoreProduct).filter_by(id=store_product_id).first()
                if not store_product:
                    raise NotFoundError(f"Store Product with ID {store_product_id} not found for update.")
                
                if store_product.quantity_in_stock < quantity: # Check against *current* stock
                    raise InsufficientStockError(f"Insufficient stock for product '{store_product.product.name}'. Available: {store_product.quantity_in_stock}, Requested: {quantity}")

                new_item = SaleItem(
                    sale_id=sale.id,
                    store_product_id=store_product_id,
                    quantity=quantity,
                    price_at_sale=price_at_sale
                )
                db.session.add(new_item)
                store_product.quantity_in_stock -= quantity
                total_sale_amount += price_at_sale * quantity
            sale.total = total_sale_amount
        
        db.session.commit()
        return sale

    @staticmethod
    def delete_sale(sale_id):
        sale = db.session.query(Sale).filter_by(id=sale_id).first()
        if not sale:
            raise NotFoundError(f"Sale with ID {sale_id} not found.")
        
        # Restore stock for deleted items
        for item in sale.sale_items:
            if not item.is_deleted: # Only restore if not already marked as deleted
                store_product = db.session.query(StoreProduct).filter_by(id=item.store_product_id).first()
                if store_product:
                    store_product.quantity_in_stock += item.quantity
        
        # Mark sale items as deleted (soft delete)
        for item in sale.sale_items:
            item.is_deleted = True # Assuming you have an is_deleted flag

        # Or, if you prefer hard delete:
        # for item in sale.sale_items:
        #     db.session.delete(item)
        # db.session.delete(sale)

        db.session.commit()