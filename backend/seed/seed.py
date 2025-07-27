# seed.py

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
    Supplier, Purchase, PurchaseItem, Sale, SaleItem
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
                store_id=None, # ⭐ FIX: Merchant store_id should be None
            )
            merchant_victor = User(
                name="Victor Merchant",
                email="victor.merchant@myduka.com",
                password="merchant123",
                role="merchant",
                store_id=None # ⭐ FIX: Merchant store_id should be None
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
                email="bob.cashier@myduka.com", # Made email unique
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
            cashier_fatuma = User( # Added another cashier for Westlands
                name="Fatuma Cashier",
                email="fatuma.cashier@myduka.com",
                password="cashier123",
                role="cashier",
                store_id=store_westlands.id
            )

            clerk_carol = User(
                name="Carol Clerk",
                email="carol.clerk@myduka.com", # Made email unique
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

            # Assign created_by relations (optional, but good for completeness)
            merchant_admin.created_by = admin_alice.id # Just an example if you want to set this
            merchant_victor.created_by = admin_alice.id
            admin_alice.created_by = merchant_admin.id # An admin could be created by a merchant
            cashier_bob.created_by = merchant_victor.id
            cashier_jane.created_by = merchant_victor.id
            cashier_wambugu.created_by = merchant_admin.id
            cashier_fatuma.created_by = admin_alice.id
            clerk_carol.created_by = admin_alice.id
            clerk_peter.created_by = admin_alice.id
            
            db.session.commit() # Commit users to ensure they are in DB for next steps
            print(f"✅ Created {User.query.count()} users with various roles.")

            # --- Store cashiers for easier access in sales seeding ---
            cashiers_main_branch = User.query.filter_by(store_id=store_main.id, role='cashier').all()
            cashiers_duka_moja = User.query.filter_by(store_id=store_duka_moja.id, role='cashier').all()
            cashiers_westlands = User.query.filter_by(store_id=store_westlands.id, role='cashier').all()
            cashiers_uptown = User.query.filter_by(store_id=store_uptown.id, role='clerk').all() # Assuming clerks can also be cashiers in Uptown
            
            # Fallback in case no cashiers were created for a store
            if not cashiers_main_branch: cashiers_main_branch = [cashier_bob] # Add a default
            if not cashiers_duka_moja: cashiers_duka_moja = [cashier_wambugu] # Add a default
            if not cashiers_westlands: cashiers_westlands = [cashier_fatuma]
            if not cashiers_uptown: cashiers_uptown = [clerk_peter] # If no cashiers, use a clerk if they handle sales


            # --- 3. Create Categories ---
            print("🛒 Creating Categories...")
            categories = []
            # Inventory seed categories (10 unique words)
            for _ in range(10):
                name = faker.unique.word().capitalize()
                description = faker.sentence(nb_words=5)
                categories.append(Category(name=name, description=description))
            
            # Specific categories from store and sales seeds
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

            # Products from inventory seed (50 random products)
            for _ in range(50):
                category = random.choice(categories)
                name = faker.unique.company() + " " + faker.word().capitalize()
                sku = faker.unique.bothify(text='???###').upper()
                unit = random.choice(["piece", "box", "bottle", "pack", "kg", "g", "ml", "L"])
                description = faker.sentence(nb_words=6)
                image_url = faker.image_url()
                products.append(Product(name=name, sku=sku, unit=unit, description=description, category_id=category.id, image_url=image_url))

            # Specific products from store and sales seeds
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
            print("📊 Creating StoreProduct records (inventory stock)...")
            store_products_to_seed = []
            all_stores = Store.query.all()
            all_products_db = Product.query.all() # Get all newly created products from DB for safety

            # Random stock for all stores and a subset of products
            for store in all_stores:
                num_products_per_store = random.randint(min(10, len(all_products_db)), min(25, len(all_products_db)))
                products_for_store = random.sample(all_products_db, num_products_per_store)

                for product in products_for_store:
                    quantity_in_stock = random.randint(0, 200)
                    base_price = Decimal(str(round(random.uniform(50, 500), 2)))
                    price = (base_price * Decimal(str(random.uniform(1.2, 2.5)))).quantize(Decimal('0.01'))
                    low_stock_threshold = random.randint(5, 50)
                    last_updated = faker.date_time_between(start_date='-60d', end_date='now', tzinfo=None)

                    store_products_to_seed.append(StoreProduct(
                        store_id=store.id,
                        product_id=product.id,
                        quantity_in_stock=quantity_in_stock,
                        price=price,
                        low_stock_threshold=low_stock_threshold,
                        last_updated=last_updated
                    ))

            # Specific StoreProducts from store and sales seeds - ensure unique product-store pairs
            # StoreProduct from store seed
            # Use query to get existing StoreProduct by store and product, or create new
            sp_d_apples = StoreProduct.query.filter_by(store=store_main, product=prod_apples).first()
            if not sp_d_apples:
                sp_d_apples = StoreProduct(store=store_main, product=prod_apples, quantity_in_stock=100, price=Decimal("150.00"), low_stock_threshold=20)
                store_products_to_seed.append(sp_d_apples)
            else:
                sp_d_apples.quantity_in_stock = 100 # Update existing
                sp_d_apples.price = Decimal("150.00")
                sp_d_apples.low_stock_threshold = 20
                
            sp_d_oranges = StoreProduct.query.filter_by(store=store_main, product=prod_oranges).first()
            if not sp_d_oranges:
                sp_d_oranges = StoreProduct(store=store_main, product=prod_oranges, quantity_in_stock=75, price=Decimal("180.00"), low_stock_threshold=15)
                store_products_to_seed.append(sp_d_oranges)
            else:
                sp_d_oranges.quantity_in_stock = 75
                sp_d_oranges.price = Decimal("180.00")
                sp_d_oranges.low_stock_threshold = 15

            sp_d_milk = StoreProduct.query.filter_by(store=store_main, product=prod_milk).first()
            if not sp_d_milk:
                sp_d_milk = StoreProduct(store=store_main, product=prod_milk, quantity_in_stock=50, price=Decimal("70.00"), low_stock_threshold=10)
                store_products_to_seed.append(sp_d_milk)
            else:
                sp_d_milk.quantity_in_stock = 50
                sp_d_milk.price = Decimal("70.00")
                sp_d_milk.low_stock_threshold = 10
            
            sp_u_apples = StoreProduct.query.filter_by(store=store_uptown, product=prod_apples).first()
            if not sp_u_apples:
                sp_u_apples = StoreProduct(store=store_uptown, product=prod_apples, quantity_in_stock=80, price=Decimal("160.00"), low_stock_threshold=25)
                store_products_to_seed.append(sp_u_apples)
            else:
                sp_u_apples.quantity_in_stock = 80
                sp_u_apples.price = Decimal("160.00")
                sp_u_apples.low_stock_threshold = 25

            sp_u_carrots = StoreProduct.query.filter_by(store=store_uptown, product=prod_carrots).first()
            if not sp_u_carrots:
                sp_u_carrots = StoreProduct(store=store_uptown, product=prod_carrots, quantity_in_stock=60, price=Decimal("90.00"), low_stock_threshold=10)
                store_products_to_seed.append(sp_u_carrots)
            else:
                sp_u_carrots.quantity_in_stock = 60
                sp_u_carrots.price = Decimal("90.00")
                sp_u_carrots.low_stock_threshold = 10

            # StoreProducts from sales seed (map to store_duka_moja and specific products)
            sp_wm = StoreProduct.query.filter_by(store=store_duka_moja, product=prod_wireless_mouse).first()
            if not sp_wm:
                sp_wm = StoreProduct(store=store_duka_moja, product=prod_wireless_mouse, price=Decimal("1200.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
                store_products_to_seed.append(sp_wm)
            
            sp_kb = StoreProduct.query.filter_by(store=store_duka_moja, product=prod_keyboard).first()
            if not sp_kb:
                sp_kb = StoreProduct(store=store_duka_moja, product=prod_keyboard, price=Decimal("2500.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
                store_products_to_seed.append(sp_kb)
            
            sp_hdmi = StoreProduct.query.filter_by(store=store_duka_moja, product=prod_hdmi_cable).first()
            if not sp_hdmi:
                sp_hdmi = StoreProduct(store=store_duka_moja, product=prod_hdmi_cable, price=Decimal("800.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
                store_products_to_seed.append(sp_hdmi)

            sp_usb = StoreProduct.query.filter_by(store=store_duka_moja, product=prod_usb_hub).first()
            if not sp_usb:
                sp_usb = StoreProduct(store=store_duka_moja, product=prod_usb_hub, price=Decimal("1500.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
                store_products_to_seed.append(sp_usb)

            # Ensure all relevant specific_sale_store_products are in the list for sales seeding
            specific_sale_store_products = [
                sp_wm, sp_kb, sp_hdmi, sp_usb,
                sp_d_apples, sp_d_oranges, sp_d_milk,
                sp_u_apples, sp_u_carrots
            ]

            # Use a set for efficient de-duplication before adding to session
            final_store_products_to_add = list({(sp.store_id, sp.product_id): sp for sp in store_products_to_seed}.values())
            
            db.session.add_all(final_store_products_to_add)
            db.session.flush() # Flush to get StoreProduct IDs
            print(f"✅ Created {StoreProduct.query.count()} StoreProduct records (inventory stock) with prices.")


            # --- 6. Create Suppliers ---
            print("🏢 Creating Suppliers...")
            supplier_abc = Supplier(
                name="ABC Distributors",
                contact_person="Jane Doe",
                phone="0700123456",
                email="abc@distributors.com",
                address="Industrial Area, Nairobi"
            )
            supplier_fresh = Supplier(name="Fresh Produce Co.", contact_person="John Doe", phone="111222333", email="john@fresh.com", address="Industrial Area")
            supplier_dairy = Supplier(name="Daily Dairy Farms", contact_person="Jane Smith", phone="444555666", email="jane@dairy.com", address="Ruiru")
            
            db.session.add_all([supplier_abc, supplier_fresh, supplier_dairy])
            db.session.flush()
            print(f"✅ Created {Supplier.query.count()} suppliers.")

            # --- 7. Create Purchases ---
            print("📃 Creating Purchases...")
            purchase1_inv = Purchase(
                supplier=supplier_abc,
                store=store_main,
                date=datetime(2025, 7, 15),
                reference_number="PO-1001",
                is_paid=True,
                notes="Initial stock delivery (Inventory Seed)"
            )
            purchase1_store = Purchase(
                supplier=supplier_fresh,
                store=store_main,
                date=date.today() - timedelta(days=7),
                reference_number="PO001",
                is_paid=True,
                notes="Weekly fruit order (Store Seed)"
            )
            purchase2_store = Purchase(
                supplier=supplier_dairy,
                store=store_main,
                date=date.today() - timedelta(days=3),
                reference_number="PO002",
                is_paid=False,
                notes="Milk delivery (Store Seed)"
            )
            db.session.add_all([purchase1_inv, purchase1_store, purchase2_store])
            db.session.flush()
            print(f"✅ Created {Purchase.query.count()} purchases.")


            # --- 8. Create Purchase Items ---
            print("🛍️ Creating Purchase Items...")
            purchase_items_to_seed = []

            # Purchase items from inventory seed
            purchase_items_to_seed.append(PurchaseItem(
                purchase=purchase1_inv,
                product=random.choice(all_products_db), # Use a random product from all_products_db
                quantity=100,
                unit_cost=Decimal('25.00')
            ))
            purchase_items_to_seed.append(PurchaseItem(
                purchase=purchase1_inv,
                product=random.choice(all_products_db), # Use another random product
                quantity=60,
                unit_cost=Decimal('30.00')
            ))

            # Purchase items from store seed
            purchase_items_to_seed.append(PurchaseItem(purchase=purchase1_store, product=prod_apples, quantity=50, unit_cost=Decimal("100.00")))
            purchase_items_to_seed.append(PurchaseItem(purchase=purchase1_store, product=prod_oranges, quantity=30, unit_cost=Decimal("130.00")))
            purchase_items_to_seed.append(PurchaseItem(purchase=purchase2_store, product=prod_milk, quantity=40, unit_cost=Decimal("50.00")))
            
            db.session.add_all(purchase_items_to_seed)
            db.session.flush()
            print(f"✅ Created {PurchaseItem.query.count()} purchase items.")


            # --- 9. Create Sales ---
            print("💰 Creating Sales...")
            sales_to_seed = []
            
            # Helper to get a random cashier for a given store
            def get_random_cashier(store_id):
                if store_id == store_main.id and cashiers_main_branch:
                    return random.choice(cashiers_main_branch)
                elif store_id == store_duka_moja.id and cashiers_duka_moja:
                    return random.choice(cashiers_duka_moja)
                elif store_id == store_westlands.id and cashiers_westlands:
                    return random.choice(cashiers_westlands)
                elif store_id == store_uptown.id and cashiers_uptown:
                    # If clerks can be cashiers for sales, use them
                    return random.choice(cashiers_uptown)
                # Fallback: if no specific cashier for store, pick a random cashier from all or assign to a default
                all_cashiers_db = User.query.filter_by(role='cashier').all()
                if all_cashiers_db:
                    return random.choice(all_cashiers_db)
                print(f"⚠️ No cashiers found for store_id {store_id}. Sale will be without cashier.")
                return None # Or raise an error if sales MUST have a cashier

            # Allowed payment statuses based on your database ENUM (assuming "paid" and "unpaid")
            ALLOWED_PAYMENT_STATUSES = ["paid", "unpaid"]

            # Sales for Duka Moja
            for _ in range(5): # Create more sales for Duka Moja to test filtering
                cashier_for_sale = get_random_cashier(store_duka_moja.id)
                if cashier_for_sale:
                    sales_to_seed.append(Sale(
                        store=store_duka_moja,
                        cashier=cashier_for_sale, # Connect via relationship
                        payment_status=random.choice(ALLOWED_PAYMENT_STATUSES), # ⭐ FIX: Only choose from allowed statuses ⭐
                        created_at=datetime.now(UTC) - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                    ))
            
            # Sales for Main Branch (CBD)
            for _ in range(10): # Create more sales for Main Branch
                cashier_for_sale = get_random_cashier(store_main.id)
                if cashier_for_sale:
                    sales_to_seed.append(Sale(
                        store=store_main,
                        cashier=cashier_for_sale, # Connect via relationship
                        payment_status=random.choice(ALLOWED_PAYMENT_STATUSES), # ⭐ FIX: Only choose from allowed statuses ⭐
                        created_at=datetime.now(UTC) - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                    ))
            
            # Sales for Westlands Branch
            for _ in range(7):
                cashier_for_sale = get_random_cashier(store_westlands.id)
                if cashier_for_sale:
                    sales_to_seed.append(Sale(
                        store=store_westlands,
                        cashier=cashier_for_sale,
                        payment_status=random.choice(ALLOWED_PAYMENT_STATUSES), # ⭐ FIX: Only choose from allowed statuses ⭐
                        created_at=datetime.now(UTC) - timedelta(days=random.randint(0, 45), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                    ))

            # Sales for Uptown Branch (using clerks if no cashiers explicitly defined)
            for _ in range(3):
                cashier_for_sale = get_random_cashier(store_uptown.id)
                if cashier_for_sale:
                    sales_to_seed.append(Sale(
                        store=store_uptown,
                        cashier=cashier_for_sale,
                        payment_status=random.choice(ALLOWED_PAYMENT_STATUSES), # ⭐ FIX: Only choose from allowed statuses ⭐
                        created_at=datetime.now(UTC) - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                    ))

            db.session.add_all(sales_to_seed)
            db.session.flush() # Flush to get sale IDs before creating sale items
            print(f"✅ Created {len(sales_to_seed)} sales.")

            # --- 10. Create Sale Items ---
            print("📦 Creating Sale Items...")
            sale_items_to_seed = []

            for sale in sales_to_seed:
                # Get store products specific to this sale's store
                available_store_products = StoreProduct.query.filter_by(store_id=sale.store_id).all()
                if not available_store_products:
                    print(f"⚠️ No StoreProducts found for store_id {sale.store_id} associated with sale {sale.id}. Skipping sale items.")
                    continue

                # Select a random number of items for each sale
                num_items_in_sale = random.randint(1, min(5, len(available_store_products)))
                selected_store_products_for_sale = random.sample(available_store_products, num_items_in_sale)

                for store_product in selected_store_products_for_sale:
                    quantity_sold = random.randint(1, min(store_product.quantity_in_stock, 10)) # Sell max 10 or current stock
                    if quantity_sold > 0:
                        sale_items_to_seed.append(SaleItem(
                            sale=sale,
                            store_product=store_product,
                            quantity=quantity_sold,
                            price_at_sale=store_product.price # Use the price from StoreProduct
                        ))
                        # Optionally update quantity_in_stock for realism
                        store_product.quantity_in_stock -= quantity_sold
                        db.session.add(store_product) # Mark for update

            db.session.add_all(sale_items_to_seed)
            db.session.commit() # Final commit
            print(f"✅ Created {len(sale_items_to_seed)} sale items.")

            print("\n--- Seeding Summary ---")
            print(f"📦 Total stores: {Store.query.count()}")
            print(f"🛒 Total categories: {Category.query.count()}")
            print(f"🧺 Total products: {Product.query.count()}")
            print(f"👤 Total users: {User.query.count()}")
            print(f"🏢 Total suppliers: {Supplier.query.count()}")
            print(f"📃 Total purchases: {Purchase.query.count()}")
            print(f"🛍️ Total purchase items: {PurchaseItem.query.count()}")
            print(f"📊 Total StoreProduct inventory records: {StoreProduct.query.count()}")
            print(f"💰 Total sales: {Sale.query.count()}")
            print(f"📦 Total sale items: {SaleItem.query.count()}")
            print("\n✅ All data seeded successfully!")
            print("\n--- Test Login Credentials ---")
            print("Merchant Admin (main user for testing):")
            print("  Email: merchant@example.com")
            print("  Password: adminpass123")
            print("\nOther Users:")
            print("  Email: victor.merchant@myduka.com, Password: merchant123")
            print("  Email: admin@myduka.com, Password: admin123")
            print("  Email: bob.cashier@myduka.com, Password: cashier123")
            print("  Email: jane.cashier@myduka.com, Password: cashier123")
            print("  Email: wambugu.cashier@myduka.com, Password: safe-password")
            print("  Email: fatuma.cashier@myduka.com, Password: cashier123")
            print("  Email: carol.clerk@myduka.com, Password: clerk123")
            print("  Email: peter.clerk@myduka.com, Password: clerk123")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()

        finally:
            db.session.close()

if __name__ == "__main__":
    seed_all()