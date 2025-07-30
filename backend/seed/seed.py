import sys
import os
from datetime import datetime, date, timedelta, UTC
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
    # AuditLog # Usually not seeded, but available
)
# No need to import hash_password if User model handles hashing on assignment

faker = Faker('en_US') # Initialize Faker, optionally with a locale

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
            # Define a wider date range for historical data (e.g., 2 years)
            end_date_for_seeding = datetime.now(UTC)
            start_date_for_seeding = end_date_for_seeding - timedelta(days=365 * 2) # 2 years of data

            # Helper function to get a random datetime within the defined range
            def get_random_date_in_range():
                return faker.date_time_between(start_date=start_date_for_seeding, end_date=end_date_for_seeding, tzinfo=UTC)

            # --- 1. Create Stores ---
            print("🏢 Creating Stores...")
            store_main = Store(name="Main Branch (CBD)", address="Tom Mboya Street, Nairobi")
            store_westlands = Store(name="Westlands Branch", address="Westlands Rd, Nairobi")
            store_uptown = Store(name="Uptown Branch", address="Kimathi Street, Nairobi")
            store_duka_moja = Store(name="Duka Moja", address="Nairobi CBD")

            all_initial_stores = [store_main, store_westlands, store_uptown, store_duka_moja]
            db.session.add_all(all_initial_stores)
            db.session.flush() # Flush to get IDs for users/products
            print(f"✅ Created {Store.query.count()} stores.")

            # --- 2. Create Users ---
            print("👤 Creating Users...")
            merchant_admin = User(
                name="Merchant Admin User",
                email="merchant@example.com",
                password="adminpass123",
                role="merchant",
                is_active=True,
                store_id=None,
            )
            merchant_victor = User(
                name="Victor Merchant",
                email="victor.merchant@myduka.com",
                password="merchant123",
                role="merchant",
                store_id=None
            )
            admin_alice = User(
                name="Alice Admin",
                email="admin@myduka.com",
                password="admin123",
                role="admin",
                store_id=store_main.id # Assign admin to a store
            )
            cashier_bob = User(
                name="Bob Cashier",
                email="bob.cashier@myduka.com",
                password="cashier123",
                role="cashier",
                store_id=store_main.id
            )
            cashier_jane = User(
                name="Jane Cashier",
                email="jane.cashier@myduka.com",
                password="cashier123",
                role="cashier",
                store_id=store_main.id # Main Branch
            )
            cashier_wambugu = User(
                name="Wambugu Cashier",
                email="wambugu.cashier@myduka.com",
                password="safe-password",
                role="cashier",
                store_id=store_duka_moja.id
            )
            cashier_fatuma = User(
                name="Fatuma Cashier",
                email="fatuma.cashier@myduka.com",
                password="cashier123",
                role="cashier",
                store_id=store_westlands.id
            )

            clerk_carol = User(
                name="Carol Clerk",
                email="carol.clerk@myduka.com",
                password="clerk123",
                role="clerk",
                store_id=store_westlands.id
            )
            clerk_peter = User(
                name="Peter Clerk",
                email="peter.clerk@myduka.com",
                password="clerk123",
                role="clerk",
                store_id=store_uptown.id
            )
            
            all_users = [
                merchant_admin, merchant_victor, admin_alice,
                cashier_bob, cashier_jane, cashier_wambugu, cashier_fatuma,
                clerk_carol, clerk_peter
            ]
            db.session.add_all(all_users)
            db.session.flush() # Flush to get user IDs for created_by and relationships

            # Assign created_by relations
            merchant_admin.created_by = admin_alice.id # Merchant created by an admin
            merchant_victor.created_by = admin_alice.id
            admin_alice.created_by = merchant_admin.id # Admin created by a merchant
            cashier_bob.created_by = merchant_victor.id
            cashier_jane.created_by = merchant_victor.id
            cashier_wambugu.created_by = merchant_admin.id
            cashier_fatuma.created_by = admin_alice.id
            clerk_carol.created_by = admin_alice.id
            clerk_peter.created_by = admin_alice.id
            
            db.session.commit() # Commit users to ensure they are in DB for next steps
            print(f"✅ Created {User.query.count()} users with various roles.")

            # --- Store cashiers and clerks for easier access in sales/supply seeding ---
            cashiers_main_branch = User.query.filter_by(store_id=store_main.id, role='cashier').all()
            cashiers_duka_moja = User.query.filter_by(store_id=store_duka_moja.id, role='cashier').all()
            cashiers_westlands = User.query.filter_by(store_id=store_westlands.id, role='cashier').all()
            
            # For Uptown, if no cashiers are explicitly created, use clerks if they handle sales
            cashiers_uptown = User.query.filter_by(store_id=store_uptown.id, role='cashier').all() 
            if not cashiers_uptown:
                cashiers_uptown = User.query.filter_by(store_id=store_uptown.id, role='clerk').all()

            clerks_westlands = User.query.filter_by(store_id=store_westlands.id, role='clerk').all()
            clerks_uptown = User.query.filter_by(store_id=store_uptown.id, role='clerk').all()
            
            # Admins (for approving supply requests)
            available_admins = User.query.filter_by(role='admin').all()


            # --- 3. Create Categories ---
            print("🛒 Creating Categories...")
            categories = []
            for _ in range(10): # 10 random categories
                name = faker.unique.word().capitalize()
                description = faker.sentence(nb_words=5)
                categories.append(Category(name=name, description=description))
            
            # Specific categories
            cat_fruits = Category(name="Fruits", description="Fresh fruits")
            cat_vegetables = Category(name="Vegetables", description="Fresh vegetables")
            cat_dairy = Category(name="Dairy & Eggs", description="Milk, cheese, yogurt, and eggs")
            cat_electronics = Category(name="Electronics", description="Electronic devices and accessories")

            categories.extend([cat_fruits, cat_vegetables, cat_dairy, cat_electronics])
            db.session.add_all(categories)
            db.session.flush() # Flush to get category IDs
            print(f"✅ Created {Category.query.count()} categories.")

            # --- 4. Create Products ---
            print("🧺 Creating Products...")
            products = []

            for _ in range(50): # 50 random products
                category = random.choice(categories)
                name = faker.unique.company() + " " + faker.word().capitalize()
                sku = faker.unique.bothify(text='???###').upper()
                unit = random.choice(["piece", "box", "bottle", "pack", "kg", "g", "ml", "L"])
                description = faker.sentence(nb_words=6)
                image_url = faker.image_url()
                products.append(Product(name=name, sku=sku, unit=unit, description=description, category_id=category.id, image_url=image_url))

            # Specific products
            prod_apples = Product(name="Apples", sku="FRT001", unit="kg", description="Sweet Red Apples", category=cat_fruits)
            prod_oranges = Product(name="Oranges", sku="FRT002", unit="kg", description="Juicy Oranges", category=cat_fruits)
            prod_milk = Product(name="Milk (Full Cream)", sku="DRY001", unit="Liter", description="Fresh full cream milk", category=cat_dairy)
            prod_carrots = Product(name="Carrots", sku="VEG001", unit="kg", description="Fresh Carrots", category=cat_vegetables)
            
            prod_wireless_mouse = Product(name="Wireless Mouse", sku="WM123", unit="pcs", description="Wireless Mouse description", category=cat_electronics)
            prod_keyboard = Product(name="Keyboard", sku="KB456", unit="pcs", description="Keyboard description", category=cat_electronics)
            prod_hdmi_cable = Product(name="HDMI Cable", sku="HD789", unit="pcs", description="HDMI Cable description", category=cat_electronics)
            prod_usb_hub = Product(name="USB Hub", sku="UH321", unit="pcs", description="USB Hub description", category=cat_electronics)

            products.extend([
                prod_apples, prod_oranges, prod_milk, prod_carrots,
                prod_wireless_mouse, prod_keyboard, prod_hdmi_cable, prod_usb_hub
            ])
            db.session.add_all(products)
            db.session.flush() # Flush to get product IDs
            print(f"✅ Created {Product.query.count()} products.")

            # --- 5. Create StoreProduct Records (Inventory Stock with Prices) ---
            print("📊 Creating StoreProduct records (initial inventory stock)...")
            store_products_to_seed = []
            all_stores_from_db = Store.query.all()
            all_products_from_db = Product.query.all()

            # Helper to get or create StoreProduct to manage potential duplicates
            def get_or_create_store_product(store_obj, product_obj, default_stock, default_price, default_threshold):
                sp = StoreProduct.query.filter_by(store_id=store_obj.id, product_id=product_obj.id).first()
                if not sp:
                    sp = StoreProduct(
                        store=store_obj, # Use object for relationship backref
                        product=product_obj, # Use object for relationship backref
                        quantity_in_stock=default_stock,
                        price=default_price,
                        low_stock_threshold=default_threshold,
                        quantity_spoilt=0 # Default to 0 spoilt for new
                    )
                else:
                    # Update existing values for specific seeding cases
                    sp.quantity_in_stock = default_stock
                    sp.price = default_price
                    sp.low_stock_threshold = default_threshold
                    # You might add logic here to *add* to existing stock or just overwrite
                return sp

            # Random initial stock for all stores and a subset of products
            for store in all_stores_from_db:
                num_products_per_store = random.randint(min(10, len(all_products_from_db)), min(25, len(all_products_from_db)))
                products_for_store = random.sample(all_products_from_db, num_products_per_store)

                for product in products_for_store:
                    quantity_in_stock = random.randint(0, 200)
                    base_price = Decimal(str(round(random.uniform(50, 500), 2)))
                    price = (base_price * Decimal(str(random.uniform(1.2, 2.5)))).quantize(Decimal('0.01'))
                    low_stock_threshold = random.randint(5, 50)
                    last_updated = faker.date_time_between(start_date='-60d', end_date='now', tzinfo=None)

                    # Ensure we don't duplicate StoreProduct if it's already added by specific seeding below
                    existing_sp = StoreProduct.query.filter_by(store_id=store.id, product_id=product.id).first()
                    if not existing_sp:
                        store_products_to_seed.append(StoreProduct(
                            store_id=store.id,
                            product_id=product.id,
                            quantity_in_stock=quantity_in_stock,
                            price=price,
                            low_stock_threshold=low_stock_threshold,
                            last_updated=last_updated,
                            quantity_spoilt=random.randint(0, quantity_in_stock // 10) # Some random spoilage
                        ))

            # Specific StoreProducts (will overwrite or create as needed)
            sp_d_apples = get_or_create_store_product(store_main, prod_apples, 100, Decimal("150.00"), 20)
            sp_d_oranges = get_or_create_store_product(store_main, prod_oranges, 75, Decimal("180.00"), 15)
            sp_d_milk = get_or_create_store_product(store_main, prod_milk, 50, Decimal("70.00"), 10)
            
            sp_u_apples = get_or_create_store_product(store_uptown, prod_apples, 80, Decimal("160.00"), 25)
            sp_u_carrots = get_or_create_store_product(store_uptown, prod_carrots, 60, Decimal("90.00"), 10)

            sp_wm = get_or_create_store_product(store_duka_moja, prod_wireless_mouse, random.randint(10, 100), Decimal("1200.00"), 5)
            sp_kb = get_or_create_store_product(store_duka_moja, prod_keyboard, random.randint(10, 100), Decimal("2500.00"), 5)
            sp_hdmi = get_or_create_store_product(store_duka_moja, prod_hdmi_cable, random.randint(10, 100), Decimal("800.00"), 5)
            sp_usb = get_or_create_store_product(store_duka_moja, prod_usb_hub, random.randint(10, 100), Decimal("1500.00"), 5)

            # Add all collected/updated StoreProduct objects to session
            # Use a set to prevent adding the same object multiple times if get_or_create returns existing ones
            unique_store_products = set(store_products_to_seed)
            unique_store_products.update([sp_d_apples, sp_d_oranges, sp_d_milk, sp_u_apples, sp_u_carrots, sp_wm, sp_kb, sp_hdmi, sp_usb])

            db.session.add_all(list(unique_store_products))
            db.session.flush() # Flush to ensure all StoreProduct objects are known to the session and have IDs
            print(f"✅ Created {StoreProduct.query.count()} StoreProduct records (inventory stock) with prices.")


            # --- 6. Create Suppliers ---
            print("🏢 Creating Suppliers...")
            supplier_abc = Supplier(
                name="ABC Distributors",
                contact_person="Jane Doe",
                phone="0700123456",
                email="abc@distributors.com",
                address="Industrial Area, Nairobi",
                notes="General electronics and office supplies"
            )
            supplier_fresh = Supplier(name="Fresh Produce Co.", contact_person="John Doe", phone="111222333", email="john@fresh.com", address="Industrial Area", notes="Daily fresh fruits and vegetables")
            supplier_dairy = Supplier(name="Daily Dairy Farms", contact_person="Jane Smith", phone="444555666", email="jane@dairy.com", address="Ruiru", notes="Milk and other dairy products")
            
            db.session.add_all([supplier_abc, supplier_fresh, supplier_dairy])
            db.session.flush()
            print(f"✅ Created {Supplier.query.count()} suppliers.")

            # --- 7. Create Purchases and Purchase Items together to calculate total_amount ---
            print("📃 Creating Purchases and Purchase Items...")
            all_suppliers = Supplier.query.all()
            all_products_from_db = Product.query.all() # Ensure this is up to date

            for store in all_initial_stores:
                num_purchases_per_store = random.randint(30, 100)
                for _ in range(num_purchases_per_store):
                    supplier = random.choice(all_suppliers)
                    purchase_date = get_random_date_in_range().date()
                    
                    purchase = Purchase(
                        supplier=supplier,
                        store=store,
                        date=purchase_date,
                        reference_number=faker.unique.bothify(text='PO-####'),
                        is_paid=faker.boolean(chance_of_getting_true=80),
                        notes=faker.sentence(nb_words=5),
                        total_amount=Decimal('0.00') # Initialize to 0, will be calculated
                    )
                    db.session.add(purchase)
                    # Flush the purchase to assign an ID, but don't commit yet
                    # This allows us to add purchase items and then update total_amount
                    db.session.flush() 

                    current_purchase_total = Decimal('0.00')
                    num_items_per_purchase = random.randint(1, 5)
                    products_for_purchase = random.sample(all_products_from_db, num_items_per_purchase)
                    
                    for product in products_for_purchase:
                        quantity = random.randint(10, 100)
                        unit_cost = Decimal(str(round(random.uniform(10, 500), 2)))
                        
                        purchase_item = PurchaseItem(
                            purchase=purchase,
                            product=product,
                            quantity=quantity,
                            unit_cost=unit_cost
                        )
                        db.session.add(purchase_item)
                        current_purchase_total += (Decimal(str(quantity)) * unit_cost).quantize(Decimal('0.01'))
                        
                        # --- Update StoreProduct quantities based on purchases ---
                        # This is crucial to ensure stock exists for sales
                        store_product = StoreProduct.query.filter_by(
                            store_id=purchase.store_id,
                            product_id=product.id
                        ).first()
                        if store_product:
                            store_product.quantity_in_stock += quantity
                        else:
                            # Create new StoreProduct if it doesn't exist for this store/product
                            new_price = Decimal(str(round(unit_cost * Decimal(str(random.uniform(1.2, 2.5))), 2))).quantize(Decimal('0.01'))
                            new_threshold = random.randint(5, 50)
                            new_sp = StoreProduct(
                                store_id=purchase.store_id,
                                product_id=product.id,
                                quantity_in_stock=quantity,
                                price=new_price,
                                low_stock_threshold=new_threshold
                            )
                            db.session.add(new_sp)
                    
                    # After all items for this purchase are added, update the total_amount
                    purchase.total_amount = current_purchase_total.quantize(Decimal('0.01'))

            db.session.flush() # Flush all new purchases and their items
            print(f"✅ Created {Purchase.query.count()} purchases with total amounts.")
            print(f"✅ Created {PurchaseItem.query.count()} purchase items.")
            print("✅ StoreProduct quantities updated based on purchases.") # Moved here as updates happen within the loop


            # --- 9. Create Sales ---
            print("💰 Creating Sales...")
            sales_to_seed = []
            
            # Helper to get a random cashier for a given store
            def get_random_cashier(store_id):
                if store_id == store_main.id:
                    return random.choice(cashiers_main_branch) if cashiers_main_branch else None
                elif store_id == store_duka_moja.id:
                    return random.choice(cashiers_duka_moja) if cashiers_duka_moja else None
                elif store_id == store_westlands.id:
                    return random.choice(cashiers_westlands) if cashiers_westlands else None
                elif store_id == store_uptown.id:
                    return random.choice(cashiers_uptown) if cashiers_uptown else None 
                return None 

            # Generate sales for each store with a random cashier
            for store in all_initial_stores:
                # Significantly increase the number of sales per store
                num_sales_per_store = random.randint(100, 500) # More sales for better trends
                for _ in range(num_sales_per_store):
                    sale_date = get_random_date_in_range() # Use a random datetime
                    cashier = get_random_cashier(store.id)
                    if cashier:
                        sales_to_seed.append(Sale(
                            store_id=store.id,
                            cashier_id=cashier.id,
                            created_at=sale_date, # Explicitly set created_at for historical sales
                            payment_status=random.choice(['paid', 'unpaid']),
                            is_deleted=faker.boolean(chance_of_getting_true=2) # Lower chance of deleted sales
                        ))
            
            db.session.add_all(sales_to_seed)
            db.session.flush()
            print(f"✅ Created {Sale.query.count()} sales.")

            # --- 10. Creating Sale Items ---
            print("📦 Creating Sale Items...")
            sale_items_to_seed = []
            
            all_sales_from_db = Sale.query.all() # Re-fetch all created sales

            for sale in all_sales_from_db:
                # Get available store products for the current sale's store that actually have stock
                available_store_products = StoreProduct.query.filter_by(store_id=sale.store_id).filter(StoreProduct.quantity_in_stock > 0).all()
                
                if not available_store_products:
                    # If no products with stock, skip adding sale items for this sale
                    continue 

                num_sale_items = random.randint(1, min(5, len(available_store_products)))
                selected_store_products = random.sample(available_store_products, num_sale_items)
                
                for store_product in selected_store_products:
                    if store_product.quantity_in_stock <= 0:
                        continue 

                    quantity_sold = random.randint(1, min(store_product.quantity_in_stock, 10))
                    
                    # Update stock and create SaleItem
                    store_product.quantity_in_stock -= quantity_sold
                    item_price = store_product.price # Use the price from StoreProduct
                    
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        store_product_id=store_product.id,
                        quantity=quantity_sold,
                        price_at_sale=item_price # Set price_at_sale as per model
                    )
                    sale_items_to_seed.append(sale_item)
                    
            db.session.add_all(sale_items_to_seed)
            db.session.commit() # Commit all sales, sale items, and updated StoreProduct quantities
            print(f"✅ Created {SaleItem.query.count()} sale items.")

            # --- 11. Create Supply Requests ---
            print("📜 Creating Supply Requests...")
            supply_requests_to_seed = []
            
            # Find clerks who can make requests
            all_clerks = User.query.filter_by(role='clerk').all()
            
            for _ in range(random.randint(5, 15)): # Create 5-15 random supply requests
                if not all_clerks or not all_products_from_db:
                    break

                clerk = random.choice(all_clerks)
                product = random.choice(all_products_from_db)
                store = clerk.store # Request for the clerk's store

                if not store: # Ensure the clerk is assigned to a store
                    continue

                # Try to get the specific store_product to check stock levels
                store_product_for_request = StoreProduct.query.filter_by(
                    store_id=store.id, product_id=product.id
                ).first()

                # Generate requests, especially for low stock items
                requested_qty = random.randint(10, 100)
                status = random.choice(['pending', 'approved', 'declined'])
                admin_user = random.choice(available_admins) if available_admins else None
                admin_response = faker.sentence() if status != 'pending' else None

                supply_request = SupplyRequest(
                    store_id=store.id,
                    product_id=product.id,
                    clerk_id=clerk.id, # Assign clerk_id
                    requested_quantity=requested_qty,
                    status=status,
                    admin_id=admin_user.id if admin_user and status != 'pending' else None,
                    admin_response=admin_response
                )
                supply_requests_to_seed.append(supply_request)
            
            db.session.add_all(supply_requests_to_seed)
            db.session.commit()
            print(f"✅ Created {SupplyRequest.query.count()} supply requests.")


            # --- 12. Create Stock Transfers (Optional) ---
            print("📦 Creating Stock Transfers...")
            stock_transfers_to_seed = []
            if len(all_initial_stores) >= 2 and all_products_from_db:
                for _ in range(random.randint(2, 5)):
                    from_store = random.choice(all_initial_stores)
                    to_store = random.choice([s for s in all_initial_stores if s != from_store])
                    
                    if not to_store: # Ensure a different store can be selected
                        continue
                        
                    initiator = random.choice(available_admins) if available_admins else None
                    approver = random.choice(available_admins) if available_admins else None
                    
                    if not initiator or not approver:
                        continue

                    status = random.choice(['pending', 'approved', 'rejected'])
                    
                    transfer = StockTransfer(
                        from_store_id=from_store.id,
                        to_store_id=to_store.id,
                        initiated_by=initiator.id,
                        approved_by=approver.id if status == 'approved' else None,
                        status=status,
                        transfer_date=faker.date_time_between(start_date='-30d', end_date='now', tzinfo=None),
                        notes=faker.sentence()
                    )
                    stock_transfers_to_seed.append(transfer)
            
            db.session.add_all(stock_transfers_to_seed)
            db.session.flush() # Flush to get transfer IDs for items

            # Create Stock Transfer Items
            stock_transfer_items_to_seed = []
            for transfer in StockTransfer.query.all(): # Fetch the flushed transfers
                num_items = random.randint(1, 3)
                products_for_transfer = random.sample(all_products_from_db, num_items)
                for product in products_for_transfer:
                    quantity = random.randint(1, 20)
                    stock_transfer_items_to_seed.append(StockTransferItem(
                        stock_transfer_id=transfer.id,
                        product_id=product.id,
                        quantity=quantity
                    ))
            db.session.add_all(stock_transfer_items_to_seed)
            db.session.commit()
            print(f"✅ Created {StockTransfer.query.count()} stock transfers and {StockTransferItem.query.count()} items.")


            db.session.commit() # Final commit for any lingering changes (e.g., created_by for users)

            print("\n🎉 Seeding complete!")

        except Exception as e:
            db.session.rollback() # Rollback on error to ensure database consistency
            print(f"❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc() # Print full traceback for debugging
            raise # Re-raise the exception to indicate failure

if __name__ == '__main__':
    seed_all()