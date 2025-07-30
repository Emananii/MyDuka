# seed.py

import sys
import os
from datetime import datetime, date, timedelta, UTC # Import UTC for timezone-aware datetimes
from faker import Faker
import random
from decimal import Decimal

# Add the project root to the Python path to allow for 'app' module import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import (
    Store, User, Category, Product, StoreProduct,
    Supplier, Purchase, PurchaseItem, Sale, SaleItem,
    SupplyRequest,
    StockTransfer, StockTransferItem,
    AuditLog # Now included for seeding
)

faker = Faker('en_US') # Initialize Faker, optionally with a locale

# --- CONFIGURATION FOR SEEDING ---
NUM_STORES = 10
NUM_USERS_PER_ROLE = {
    'merchant': 3,
    'admin': 5,
    'clerk': 10,
    'cashier': 15
}
NUM_CATEGORIES = 20
NUM_PRODUCTS = 200
NUM_SUPPLIERS = 15
NUM_PURCHASES = 300 # Increased
NUM_SALES = 1000 # Increased significantly for trend data
NUM_SUPPLY_REQUESTS = 150 # Increased
NUM_STOCK_TRANSFERS = 50 # Increased
NUM_AUDIT_LOGS = 200 # New: Number of audit log entries

# Date range for transactions (1.5 years back from current date)
START_DATE = datetime.now(UTC) - timedelta(days=365 * 1.5)
END_DATE = datetime.now(UTC)

def seed_all():
    app = create_app()

    with app.app_context():
        print("Loaded DATABASE_URI:", os.getenv("DATABASE_URI"))
        print("\n--- Starting Database Reset ---")
        try:
            print("🔄 Dropping all tables...")
            db.drop_all()
            print("✅ drop_all() successful")

            print("✅ Creating all tables...")
            db.create_all()
            print("✅ create_all() successful")

        except Exception as e:
            print(f"❌ Error during schema reset: {e}")
            raise

        print("\n--- Seeding Test Data ---")
        try:
            # --- 1. Create Stores ---
            print(f"🏢 Creating {NUM_STORES} Stores...")
            stores = []
            for i in range(NUM_STORES):
                stores.append(Store(
                    name=faker.company() + " Branch " + str(i + 1),
                    address=faker.address()
                ))
            db.session.add_all(stores)
            db.session.flush() # Flush to get IDs for relationships
            print(f"✅ Created {Store.query.count()} stores.")

            # --- 2. Create Users ---
            print("👤 Creating Users...")
            users = []
            
            # Create base merchant and admin for initial setup and created_by relations
            merchant_admin = User(
                name="System Merchant Admin",
                email="merchant_sys@example.com",
                password="adminpass123",
                role="merchant",
                is_active=True,
                store_id=None,
            )
            users.append(merchant_admin)
            db.session.add(merchant_admin) # Add immediately to get ID
            db.session.flush() # Flush to make merchant_admin available for created_by

            admin_root = User(
                name="Root Admin",
                email="admin_root@example.com",
                password="adminpass123",
                role="admin",
                is_active=True,
                store_id=None, # Root admin might not be tied to a specific store
                created_by=merchant_admin.id # Created by merchant admin
            )
            users.append(admin_root)
            db.session.add(admin_root)
            db.session.flush() # Flush to make admin_root available for created_by

            # Generate other users
            for role, count in NUM_USERS_PER_ROLE.items():
                # Adjust start_index to avoid duplicating the 'base' merchant/admin
                if role in ['merchant', 'admin']: 
                    start_index = 1 
                else:
                    start_index = 0 
                for i in range(start_index, count):
                    name = faker.name()
                    email_prefix = faker.unique.user_name()
                    email = f"{email_prefix}.{role}@{faker.domain_name()}"
                    password = "password123" if role != 'admin' else "adminpass"
                    
                    # Assign to a random store if not merchant (merchants are store-agnostic initially)
                    assigned_store = random.choice(stores) if role != 'merchant' else None
                    
                    # Randomly assign created_by: admins typically create cashiers/clerks; merchants create admins/merchants
                    creator = None
                    if role == 'admin':
                        creator = random.choice([u for u in users if u.role == 'merchant']) if any(u.role == 'merchant' for u in users) else merchant_admin
                    elif role == 'merchant':
                        creator = random.choice([u for u in users if u.role == 'admin']) if any(u.role == 'admin' for u in users) else admin_root
                    else: # cashier, clerk
                        creator = random.choice([u for u in users if u.role == 'admin']) if any(u.role == 'admin' for u in users) else admin_root

                    new_user = User(
                        name=name,
                        email=email,
                        password=password,
                        role=role,
                        is_active=faker.boolean(chance_of_getting_true=90), # Some inactive users
                        store_id=assigned_store.id if assigned_store else None,
                        created_by=creator.id if creator else None
                    )
                    users.append(new_user)
                    db.session.add(new_user)

            db.session.flush() # Flush to get all user IDs for `created_by` and relationships
            db.session.commit() # Commit users to ensure they are in DB for next steps

            print(f"✅ Created {User.query.count()} users with various roles.")

            # Store cashiers and clerks and admins for easier access in sales/supply/transfer seeding
            all_cashiers = User.query.filter_by(role='cashier').all()
            all_clerks = User.query.filter_by(role='clerk').all()
            all_admins = User.query.filter_by(role='admin').all()


            # --- 3. Create Categories ---
            print(f"🛒 Creating {NUM_CATEGORIES} Categories...")
            categories = []
            for _ in range(NUM_CATEGORIES):
                name = faker.unique.word().capitalize() + " " + faker.random_letter().upper()
                description = faker.sentence(nb_words=8)
                categories.append(Category(name=name, description=description))
            
            db.session.add_all(categories)
            db.session.flush()
            print(f"✅ Created {Category.query.count()} categories.")

            # --- 4. Create Products ---
            print(f"🧺 Creating {NUM_PRODUCTS} Products...")
            products = []
            for _ in range(NUM_PRODUCTS):
                category = random.choice(categories)
                name = faker.unique.catch_phrase() # More varied names
                sku = faker.unique.bothify(text='???###???').upper()
                unit = random.choice(["piece", "box", "bottle", "pack", "kg", "g", "ml", "L", "bundle"])
                description = faker.paragraph(nb_sentences=2, variable_nb_sentences=True)
                image_url = faker.image_url(width=400, height=300) # Added image_url

                products.append(Product(
                    name=name,
                    sku=sku,
                    unit=unit,
                    description=description,
                    category_id=category.id,
                    image_url=image_url
                ))
            
            db.session.add_all(products)
            db.session.flush()
            print(f"✅ Created {Product.query.count()} products.")

            # --- 5. Create StoreProduct Records (Inventory Stock with Prices) ---
            print("📊 Creating StoreProduct records (inventory stock)...")
            
            # Helper to get or create StoreProduct to manage potential duplicates and ensure it's in session
            def get_or_create_store_product(store_obj, product_obj, initial_stock, initial_price, initial_threshold, created_at_dt):
                sp = StoreProduct.query.filter_by(store_id=store_obj.id, product_id=product_obj.id).first()
                if not sp:
                    sp = StoreProduct(
                        store=store_obj,
                        product=product_obj,
                        quantity_in_stock=initial_stock,
                        price=initial_price,
                        low_stock_threshold=initial_threshold,
                        quantity_spoilt=0, # Default for newly created
                        created_at=created_at_dt,
                        updated_at=created_at_dt
                    )
                    db.session.add(sp) # Add new ones directly to session
                else:
                    # Update existing values if called for an existing StoreProduct (e.g., from purchase)
                    sp.quantity_in_stock = initial_stock
                    sp.price = initial_price
                    sp.low_stock_threshold = initial_threshold
                    sp.updated_at = created_at_dt # Update timestamp
                return sp

            # Ensure every store has a good subset of products, and every product is in at least one store
            store_products_to_add = []
            for store in stores:
                # Give each store a large random subset of products
                num_products_per_store = random.randint(NUM_PRODUCTS // 4, NUM_PRODUCTS // 2) # e.g., 50-100 products
                products_for_store = random.sample(products, num_products_per_store)

                for product in products_for_store:
                    quantity_in_stock = random.randint(0, 500) # Increased stock range
                    base_price = Decimal(str(round(random.uniform(20, 1000), 2))) # Wider price range
                    price = (base_price * Decimal(str(random.uniform(1.2, 2.5)))).quantize(Decimal('0.01'))
                    low_stock_threshold = random.randint(5, 50)
                    initial_stock_date = faker.date_time_between(start_date=START_DATE, end_date=END_DATE, tzinfo=UTC)
                    quantity_spoilt = random.randint(0, quantity_in_stock // 20) # Up to 5% spoilage

                    store_products_to_add.append(StoreProduct(
                        store_id=store.id,
                        product_id=product.id,
                        quantity_in_stock=quantity_in_stock,
                        price=price,
                        low_stock_threshold=low_stock_threshold,
                        last_updated=initial_stock_date,
                        quantity_spoilt=quantity_spoilt,
                        created_at=initial_stock_date,
                        updated_at=initial_stock_date
                    ))
            
            db.session.add_all(store_products_to_add)
            db.session.flush()
            print(f"✅ Created {StoreProduct.query.count()} StoreProduct records (inventory stock) with prices.")


            # --- 6. Create Suppliers ---
            print(f"🏢 Creating {NUM_SUPPLIERS} Suppliers...")
            suppliers = []
            for _ in range(NUM_SUPPLIERS):
                suppliers.append(Supplier(
                    name=faker.company() + " Supplies",
                    contact_person=faker.name(),
                    phone=faker.phone_number(),
                    email=faker.email(),
                    address=faker.address(),
                    notes=faker.sentence()
                ))
            db.session.add_all(suppliers)
            db.session.flush()
            print(f"✅ Created {Supplier.query.count()} suppliers.")

            # --- 7. Create Purchases ---
            print(f"📃 Creating {NUM_PURCHASES} Purchases...")
            purchases_to_seed = []
            
            for _ in range(NUM_PURCHASES):
                supplier = random.choice(suppliers)
                store = random.choice(stores)
                
                # Generate a full datetime object for the purchase's creation time
                purchase_created_at = faker.date_time_between(start_date=START_DATE, end_date=END_DATE, tzinfo=UTC)
                
                # Extract just the date part for the 'date' field in the Purchase model
                purchase_date_only = purchase_created_at.date() 

                purchases_to_seed.append(Purchase(
                    supplier_id=supplier.id, # Link by ID
                    store_id=store.id,      # Link by ID
                    date=purchase_date_only, # This is now correctly a date object
                    reference_number=faker.unique.bothify(text='PO-####-????'),
                    is_paid=faker.boolean(chance_of_getting_true=80),
                    notes=faker.sentence() if faker.boolean(chance_of_getting_true=50) else None,
                    created_at=purchase_created_at, # This is a datetime object
                    updated_at=purchase_created_at  # Initially same
                ))
            db.session.add_all(purchases_to_seed)
            db.session.flush() # Flush to get purchase IDs before creating items
            print(f"✅ Created {Purchase.query.count()} purchases.")


            # --- 8. Create Purchase Items ---
            print("🛍️ Creating Purchase Items and updating stock...")
            purchase_items_to_seed = []
            
            # Fetch flushed purchases to ensure they have IDs
            all_purchases = Purchase.query.all()

            for purchase in all_purchases:
                # Select a random number of items for each purchase
                num_items_per_purchase = random.randint(1, 10)
                
                # Get a random set of products
                products_for_purchase = random.sample(products, min(num_items_per_purchase, len(products)))

                for product in products_for_purchase:
                    quantity = random.randint(10, 200) # Increased quantity range
                    unit_cost = Decimal(str(round(random.uniform(10, 800), 2))) # Wider cost range

                    purchase_item = PurchaseItem(
                        purchase_id=purchase.id, # Link by ID after purchase is flushed
                        product_id=product.id,
                        quantity=quantity,
                        unit_cost=unit_cost,
                        created_at=purchase.created_at, # Set to same as purchase
                        updated_at=purchase.updated_at # Set to same as purchase
                    )
                    purchase_items_to_seed.append(purchase_item)

                    # Update StoreProduct quantity_in_stock for the relevant store and product
                    store_product = StoreProduct.query.filter_by(
                        store_id=purchase.store_id, product_id=product.id
                    ).first()

                    if store_product:
                        store_product.quantity_in_stock += quantity
                        store_product.last_updated = purchase.updated_at # Use purchase update time
                        store_product.updated_at = purchase.updated_at
                    else:
                        # If a product is purchased for a store that doesn't "stock" it yet, create StoreProduct
                        # Assuming a default price based on unit_cost + markup
                        new_price = (unit_cost * Decimal(str(random.uniform(1.2, 2.0)))).quantize(Decimal('0.01'))
                        # Use get_or_create to ensure it's added/updated in session
                        get_or_create_store_product(
                            db.session.get(Store, purchase.store_id), # Pass Store object
                            product, quantity, new_price, 10, purchase.created_at
                        )

            db.session.add_all(purchase_items_to_seed)
            db.session.flush()
            print(f"✅ Created {PurchaseItem.query.count()} purchase items and updated stock.")


            # --- 9. Create Sales ---
            print(f"💰 Creating {NUM_SALES} Sales...")
            sales_to_seed = []
            
            for _ in range(NUM_SALES):
                store = random.choice(stores)
                
                # Try to find a cashier specific to the store
                store_cashiers = [c for c in all_cashiers if c.store_id == store.id]
                cashier = None
                if store_cashiers:
                    cashier = random.choice(store_cashiers)
                else:
                    # Fallback to any available cashier if no store-specific one
                    if all_cashiers:
                        cashier = random.choice(all_cashiers)
                    elif all_admins: # Fallback to admin if no cashiers at all
                        cashier = random.choice(all_admins)
                
                if not cashier:
                    # If no suitable cashier/admin found, skip this sale
                    # This could happen if you have very few cashiers/admins and many stores
                    continue 

                sale_time = faker.date_time_between(start_date=START_DATE, end_date=END_DATE, tzinfo=UTC)

                sales_to_seed.append(Sale(
                    store_id=store.id,
                    cashier_id=cashier.id,
                    payment_status=random.choice(['paid', 'unpaid']),
                    is_deleted=faker.boolean(chance_of_getting_true=2), # Lower chance of deleted sales
                    created_at=sale_time, # Set creation time for sales
                    updated_at=sale_time # Initially same
                ))
            
            db.session.add_all(sales_to_seed)
            db.session.flush() # Flush to get Sale IDs for SaleItems
            print(f"✅ Created {Sale.query.count()} sales.")

            # --- 10. Creating Sale Items ---
            print("📦 Creating Sale Items and updating stock...")
            sale_items_to_seed = []
            
            all_sales_from_db = Sale.query.all() # Re-fetch all created sales (after flush)

            for sale in all_sales_from_db:
                # Get available store products for the current sale's store that actually have stock
                available_store_products = StoreProduct.query.filter_by(store_id=sale.store_id).filter(StoreProduct.quantity_in_stock > 0).all()
                
                if not available_store_products:
                    # If no products with stock in this store, skip adding sale items for this sale
                    continue 

                # Select a random number of unique items for this sale, up to 10 or available products
                num_sale_items = random.randint(1, min(10, len(available_store_products)))
                selected_store_products = random.sample(available_store_products, num_sale_items)
                
                for store_product in selected_store_products:
                    if store_product.quantity_in_stock <= 0:
                        continue 

                    quantity_sold = random.randint(1, min(store_product.quantity_in_stock, 5)) # Sell smaller quantities
                    
                    if quantity_sold == 0: continue # Don't create 0-quantity sale items

                    # Update stock
                    store_product.quantity_in_stock -= quantity_sold
                    # ensure updated_at reflects the sale
                    store_product.last_updated = sale.created_at
                    store_product.updated_at = sale.created_at # Also update model's updated_at
                    
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        store_product_id=store_product.id,
                        quantity=quantity_sold,
                        price_at_sale=store_product.current_price, # Use the hybrid property here
                        created_at=sale.created_at, # Set to same as sale
                        updated_at=sale.updated_at # Set to same as sale
                    )
                    sale_items_to_seed.append(sale_item)
            
            db.session.add_all(sale_items_to_seed)
            db.session.flush() # Flush sale items and updated store products
            print(f"✅ Created {SaleItem.query.count()} sale items and updated stock levels.")

            # --- 11. Create Supply Requests ---
            print(f"📜 Creating {NUM_SUPPLY_REQUESTS} Supply Requests...")
            supply_requests_to_seed = []
            
            for _ in range(NUM_SUPPLY_REQUESTS):
                # Ensure we have enough relevant users/products/stores to create requests
                if not all_clerks or not products or not stores or not all_admins:
                    break

                clerk = random.choice(all_clerks)
                product = random.choice(products)
                store = clerk.store # Request for the clerk's store

                if not store: # If clerk is not assigned to a store, skip
                    continue

                requested_qty = random.randint(20, 300) # Increased request range
                status = random.choice(['pending', 'approved', 'declined'])
                
                admin_user = None
                admin_response_text = None
                if status != 'pending' and all_admins: # Only assign admin if status is not pending
                    admin_user = random.choice(all_admins)
                    admin_response_text = faker.sentence()

                request_time = faker.date_time_between(start_date=START_DATE, end_date=END_DATE, tzinfo=UTC)

                supply_request = SupplyRequest(
                    store_id=store.id,
                    product_id=product.id,
                    clerk_id=clerk.id,
                    requested_quantity=requested_qty,
                    status=status,
                    admin_id=admin_user.id if admin_user else None,
                    admin_response=admin_response_text,
                    created_at=request_time,
                    updated_at=request_time
                )
                supply_requests_to_seed.append(supply_request)
            
            db.session.add_all(supply_requests_to_seed)
            db.session.flush()
            print(f"✅ Created {SupplyRequest.query.count()} supply requests.")


            # --- 12. Create Stock Transfers ---
            print(f"📦 Creating {NUM_STOCK_TRANSFERS} Stock Transfers...")
            stock_transfers_to_seed = []
            
            if len(stores) >= 2 and products and all_admins: # Ensure enough stores, products, and admins
                for _ in range(NUM_STOCK_TRANSFERS):
                    from_store = random.choice(stores)
                    to_store = random.choice([s for s in stores if s.id != from_store.id])
                    
                    if not to_store: # Should not happen if len(stores) >= 2, but good for safety
                        continue
                            
                    initiator = random.choice(all_admins)
                    approver = random.choice(all_admins)
                    
                    status = random.choice(['pending', 'approved', 'rejected'])
                    transfer_datetime = faker.date_time_between(start_date=START_DATE, end_date=END_DATE, tzinfo=UTC)
                    
                    transfer = StockTransfer(
                        from_store_id=from_store.id,
                        to_store_id=to_store.id,
                        initiated_by=initiator.id,
                        approved_by=approver.id if status == 'approved' else None,
                        status=status,
                        transfer_date=transfer_datetime,
                        notes=faker.sentence(),
                        created_at=transfer_datetime,
                        updated_at=transfer_datetime
                    )
                    stock_transfers_to_seed.append(transfer)
            
            db.session.add_all(stock_transfers_to_seed)
            db.session.flush() # Flush to get transfer IDs for items

            # Create Stock Transfer Items and update stock accordingly
            stock_transfer_items_to_seed = []
            for transfer in StockTransfer.query.all(): # Fetch the flushed transfers to ensure IDs are available
                num_items = random.randint(1, 5) # 1 to 5 items per transfer
                products_for_transfer = random.sample(products, min(num_items, len(products)))

                for product in products_for_transfer:
                    quantity_to_transfer = random.randint(1, 50) # Quantity per item
                    
                    # Get the StoreProduct from the 'from' store
                    from_store_product = StoreProduct.query.filter_by(
                        store_id=transfer.from_store_id, product_id=product.id
                    ).first()
                    
                    if not from_store_product or from_store_product.quantity_in_stock < quantity_to_transfer:
                        # Skip if not enough stock or product not in 'from' store
                        continue

                    stock_transfer_item = StockTransferItem(
                        stock_transfer_id=transfer.id,
                        product_id=product.id,
                        quantity=quantity_to_transfer,
                        created_at=transfer.created_at, # Use transfer creation time
                        updated_at=transfer.updated_at
                    )
                    stock_transfer_items_to_seed.append(stock_transfer_item)

                    # Update stock if transfer is approved
                    if transfer.status == 'approved':
                        from_store_product.quantity_in_stock -= quantity_to_transfer
                        from_store_product.last_updated = transfer.transfer_date
                        from_store_product.updated_at = transfer.transfer_date

                        # Add to 'to' store's stock, create if not exists
                        to_store_product = StoreProduct.query.filter_by(
                            store_id=transfer.to_store_id, product_id=product.id
                        ).first()

                        if to_store_product:
                            to_store_product.quantity_in_stock += quantity_to_transfer
                            to_store_product.last_updated = transfer.transfer_date
                            to_store_product.updated_at = transfer.transfer_date
                        else:
                            # If product not in target store, add it with a default price
                            default_price = Decimal(str(round(random.uniform(50, 500), 2)))
                            # Use get_or_create_store_product helper
                            get_or_create_store_product(
                                db.session.get(Store, transfer.to_store_id), # Fetch store object
                                db.session.get(Product, product.id),         # Fetch product object
                                quantity_to_transfer, default_price, 10, transfer.created_at
                            )

            db.session.add_all(stock_transfer_items_to_seed)
            db.session.flush() # Flush items and stock updates
            print(f"✅ Created {StockTransfer.query.count()} stock transfers and {StockTransferItem.query.count()} items.")

            # --- 13. Create Audit Logs ---
            print(f"📝 Creating {NUM_AUDIT_LOGS} Audit Logs...")
            audit_logs_to_seed = []
            
            # Example actions to log
            actions = ["CREATED", "UPDATED", "DELETED", "LOGIN", "LOGOUT", "PASSWORD_RESET", "VIEWED", "FAILED_LOGIN"]
            entity_types = ["User", "Product", "Store", "Sale", "Purchase", "Category", "Supplier", "StockTransfer", "SupplyRequest", "StoreProduct"]

            # Ensure lists are not empty before choosing
            # Use `list(filter(None, ...))` to ensure no `None` values if original lists were empty
            valid_users_for_audit = [u for u in users if u is not None] if users else []
            valid_sales_for_audit = [s for s in all_sales_from_db if s is not None] if all_sales_from_db else []
            valid_purchases_for_audit = [p for p in all_purchases if p is not None] if all_purchases else []


            for _ in range(NUM_AUDIT_LOGS):
                if not valid_users_for_audit: continue # Skip if no users available

                user = random.choice(valid_users_for_audit) 
                action = random.choice(actions)
                entity_type = random.choice(entity_types)
                
                # Assign a more realistic entity_id if possible
                entity_id = None
                if entity_type == "User" and users: entity_id = random.choice(users).id
                elif entity_type == "Product" and products: entity_id = random.choice(products).id
                elif entity_type == "Store" and stores: entity_id = random.choice(stores).id
                elif entity_type == "Sale" and valid_sales_for_audit: entity_id = random.choice(valid_sales_for_audit).id
                elif entity_type == "Purchase" and valid_purchases_for_audit: entity_id = random.choice(valid_purchases_for_audit).id
                else: entity_id = faker.random_int(min=1, max=500) # Fallback random ID

                metadata = {"ip_address": faker.ipv4(), "browser": faker.user_agent(), "device": faker.word()}
                if action == "FAILED_LOGIN":
                    metadata["reason"] = faker.sentence(nb_words=3)
                
                log_time = faker.date_time_between(start_date=START_DATE, end_date=END_DATE, tzinfo=UTC)

                audit_logs_to_seed.append(AuditLog(
                    user_id=user.id,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    metadata_json=metadata,
                    created_at=log_time
                ))
            db.session.add_all(audit_logs_to_seed)
            
            db.session.commit() # Final commit for all changes

            print("\n🎉 Seeding complete!")
            print(f"Final counts:")
            print(f"  Stores: {Store.query.count()}")
            print(f"  Users: {User.query.count()}")
            print(f"  Categories: {Category.query.count()}")
            print(f"  Products: {Product.query.count()}")
            print(f"  StoreProducts: {StoreProduct.query.count()}")
            print(f"  Suppliers: {Supplier.query.count()}")
            print(f"  Purchases: {Purchase.query.count()}")
            print(f"  PurchaseItems: {PurchaseItem.query.count()}")
            print(f"  Sales: {Sale.query.count()}")
            print(f"  SaleItems: {SaleItem.query.count()}")
            print(f"  SupplyRequests: {SupplyRequest.query.count()}")
            print(f"  StockTransfers: {StockTransfer.query.count()}")
            print(f"  StockTransferItems: {StockTransferItem.query.count()}")
            print(f"  AuditLogs: {AuditLog.query.count()}")


        except Exception as e:
            db.session.rollback() # Rollback on error to ensure database consistency
            print(f"❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc() # Print full traceback for debugging
            raise # Re-raise the exception to indicate failure

if __name__ == '__main__':
    seed_all()