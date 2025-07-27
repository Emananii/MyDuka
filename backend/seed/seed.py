# seed.py

import sys
import os
from datetime import datetime, date, timedelta
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
            print("❌ Error during schema reset:", e)
            raise

        print("\n--- Seeding Test Data ---")
        try:
            # --- 1. Create Stores ---
            print("🏢 Creating Stores...")
            store_main = Store(name="Main Branch (CBD)", address="Tom Mboya Street, Nairobi")
            store_westlands = Store(name="Westlands Branch", address="Westlands Rd, Nairobi")
            store_uptown = Store(name="Uptown Branch", address="Kimathi Street, Nairobi") # From your store seed
            store_duka_moja = Store(name="Duka Moja", address="Nairobi CBD") # From your sales seed

            # Use a list to ensure all are added and committed together
            all_initial_stores = [store_main, store_westlands, store_uptown, store_duka_moja]
            db.session.add_all(all_initial_stores)
            db.session.flush() # Flush to get IDs for users/products

            print(f"✅ Created {Store.query.count()} stores.")

            # --- 2. Create Users ---
            print("👤 Creating Users...")
            # Merchant (from auth seed, but email adjusted for unique identity)
            merchant_admin = User(
                name="Merchant Admin User",
                email="merchant@example.com", # Keeping this for initial login
                password="adminpass123",
                role="merchant",
                is_active=True,
                store_id=store_main.id,
            )
            # Other users (from inventory and store seeds)
            merchant_victor = User(
                name="Victor Merchant",
                email="victor.merchant@myduka.com", # Unique email
                password="merchant123",
                role="merchant",
                store_id=store_main.id
            )
            admin_alice = User(
                name="Alice Admin",
                email="admin@myduka.com",
                password="admin123",
                role="admin",
                store_id=None # Admins can be global initially
            )
            cashier_bob = User(
                name="Bob Cashier",
                email="cashier@myduka.com", # Keeping this for consistency
                password="cashier123",
                role="cashier",
                store_id=store_main.id
            )
            clerk_carol = User(
                name="Carol Clerk",
                email="clerk@myduka.com",
                password="clerk123",
                role="clerk",
                store_id=store_westlands.id # Assuming store_westlands maps to "Uptown Branch" idea
            )
            cashier_wambugu = User( # From sales seed
                name="Wambugu Cashier",
                email="wambugu.cashier@myduka.com", # Unique email
                password="safe-password",
                role="cashier",
                store_id=store_duka_moja.id
            )
            jane_cashier = User( # From store seed
                name="Jane Cashier",
                email="jane.cashier@myduka.com", # Unique email
                password="cashier123",
                role="cashier",
                store_id=store_main.id # Assuming Downtown Store is now Main Branch (CBD)
            )
            peter_clerk = User( # From store seed
                name="Peter Clerk",
                email="peter.clerk@myduka.com", # Unique email
                password="clerk123",
                role="clerk",
                store_id=store_uptown.id
            )

            all_users = [
                merchant_admin, merchant_victor, admin_alice,
                cashier_bob, clerk_carol, cashier_wambugu,
                jane_cashier, peter_clerk
            ]
            db.session.add_all(all_users)
            db.session.flush() # Flush to get user IDs for created_by

            # Set created_by relations (from store seed)
            merchant_admin.created_by = admin_alice.id # Just an example if you want to set this
            merchant_victor.created_by = admin_alice.id
            cashier_bob.created_by = merchant_victor.id
            clerk_carol.created_by = admin_alice.id
            cashier_wambugu.created_by = merchant_admin.id
            jane_cashier.created_by = merchant_victor.id
            peter_clerk.created_by = admin_alice.id
            
            db.session.add_all([
                merchant_admin, merchant_victor, cashier_bob, clerk_carol,
                cashier_wambugu, jane_cashier, peter_clerk
            ])
            db.session.commit() # Commit users to ensure they are in DB for next steps
            print(f"✅ Created {User.query.count()} users with various roles.")

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
            all_products = Product.query.all() # Get all newly created products

            # Random stock for all stores and a subset of products
            for store in all_stores:
                num_products_per_store = random.randint(min(10, len(all_products)), min(25, len(all_products)))
                products_for_store = random.sample(all_products, num_products_per_store)

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
            sp_d_apples = StoreProduct(store=store_main, product=prod_apples, quantity_in_stock=100, price=Decimal("150.00"), low_stock_threshold=20)
            sp_d_oranges = StoreProduct(store=store_main, product=prod_oranges, quantity_in_stock=75, price=Decimal("180.00"), low_stock_threshold=15)
            sp_d_milk = StoreProduct(store=store_main, product=prod_milk, quantity_in_stock=50, price=Decimal("70.00"), low_stock_threshold=10)
            
            sp_u_apples = StoreProduct(store=store_uptown, product=prod_apples, quantity_in_stock=80, price=Decimal("160.00"), low_stock_threshold=25)
            sp_u_carrots = StoreProduct(store=store_uptown, product=prod_carrots, quantity_in_stock=60, price=Decimal("90.00"), low_stock_threshold=10)

            # StoreProducts from sales seed (map to store_duka_moja and specific products)
            sp_wm = StoreProduct(store=store_duka_moja, product=prod_wireless_mouse, price=Decimal("1200.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
            sp_kb = StoreProduct(store=store_duka_moja, product=prod_keyboard, price=Decimal("2500.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
            sp_hdmi = StoreProduct(store=store_duka_moja, product=prod_hdmi_cable, price=Decimal("800.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)
            sp_usb = StoreProduct(store=store_duka_moja, product=prod_usb_hub, price=Decimal("1500.00"), quantity_in_stock=random.randint(10, 100), low_stock_threshold=5)


            # Use a dictionary to de-duplicate StoreProduct entries (store_id, product_id)
            unique_store_products = {}
            for sp in store_products_to_seed:
                unique_store_products[(sp.store_id, sp.product_id)] = sp

            # Add specific ones, overriding random ones if they clash
            unique_store_products[(sp_d_apples.store_id, sp_d_apples.product_id)] = sp_d_apples
            unique_store_products[(sp_d_oranges.store_id, sp_d_oranges.product_id)] = sp_d_oranges
            unique_store_products[(sp_d_milk.store_id, sp_d_milk.product_id)] = sp_d_milk
            unique_store_products[(sp_u_apples.store_id, sp_u_apples.product_id)] = sp_u_apples
            unique_store_products[(sp_u_carrots.store_id, sp_u_carrots.product_id)] = sp_u_carrots
            unique_store_products[(sp_wm.store_id, sp_wm.product_id)] = sp_wm
            unique_store_products[(sp_kb.store_id, sp_kb.product_id)] = sp_kb
            unique_store_products[(sp_hdmi.store_id, sp_hdmi.product_id)] = sp_hdmi
            unique_store_products[(sp_usb.store_id, sp_usb.product_id)] = sp_usb

            # Store products that will be used specifically for sales
            # This list will be passed to sales seeding.
            specific_sale_store_products = [sp_wm, sp_kb, sp_hdmi, sp_usb]

            db.session.add_all(unique_store_products.values())
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
            purchase1_inv = Purchase( # From inventory seed
                supplier=supplier_abc,
                store=store_main,
                date=datetime(2025, 7, 15),
                reference_number="PO-1001",
                is_paid=True,
                notes="Initial stock delivery (Inventory Seed)"
            )
            purchase1_store = Purchase( # From store seed
                supplier=supplier_fresh,
                store=store_main,
                date=date.today() - timedelta(days=7),
                reference_number="PO001",
                is_paid=True,
                notes="Weekly fruit order (Store Seed)"
            )
            purchase2_store = Purchase( # From store seed
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
                product=random.choice(products), # Use a random product that exists in inventory
                quantity=100,
                unit_cost=Decimal('25.00')
            ))
            purchase_items_to_seed.append(PurchaseItem(
                purchase=purchase1_inv,
                product=random.choice(products), # Use another random product
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
            
            # Sales from sales seed
            for i in range(3):  # Create 3 sales
                sales_to_seed.append(Sale(
                    store=store_duka_moja,
                    cashier=cashier_wambugu,
                    payment_status="paid",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)) # Distribute dates
                ))
            
            # Sales from store seed
            sales_to_seed.append(Sale(store=store_main, cashier=jane_cashier, payment_status="paid", created_at=datetime.utcnow()))
            sales_to_seed.append(Sale(store=store_main, cashier=jane_cashier, payment_status="unpaid", created_at=datetime.utcnow() - timedelta(hours=5)))
            sales_to_seed.append(Sale(store=store_uptown, cashier=peter_clerk, payment_status="paid", created_at=datetime.utcnow() - timedelta(days=1)))
            
            db.session.add_all(sales_to_seed)
            db.session.flush()
            print(f"✅ Created {len(sales_to_seed)} sales.")

            # --- 10. Create Sale Items ---
            print("📦 Creating Sale Items...")
            sale_items_to_seed = []

            # Sale items from sales seed (linking to specific_sale_store_products)
            for sale in [s for s in sales_to_seed if s.store == store_duka_moja]: # Only target sales made at Duka Moja
                selected_store_products = random.sample(specific_sale_store_products, k=random.randint(1, min(3, len(specific_sale_store_products))))
                for store_product in selected_store_products:
                    sale_items_to_seed.append(SaleItem(
                        sale=sale,
                        store_product=store_product,
                        quantity=random.randint(1, 5),
                        price_at_sale=store_product.price
                    ))
            
            # Sale items from store seed (linking to specific store products for downtown/uptown)
            sale_items_to_seed.append(SaleItem(sale=sales_to_seed[-3], store_product=sp_d_apples, quantity=5, price_at_sale=sp_d_apples.price)) # Assuming last 3 sales are from store seed
            sale_items_to_seed.append(SaleItem(sale=sales_to_seed[-3], store_product=sp_d_oranges, quantity=3, price_at_sale=sp_d_oranges.price))
            sale_items_to_seed.append(SaleItem(sale=sales_to_seed[-2], store_product=sp_d_milk, quantity=2, price_at_sale=sp_d_milk.price))
            sale_items_to_seed.append(SaleItem(sale=sales_to_seed[-1], store_product=sp_u_apples, quantity=4, price_at_sale=sp_u_apples.price))

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
            print("  Email: cashier@myduka.com, Password: cashier123")
            print("  Email: clerk@myduka.com, Password: clerk123")
            print("  Email: wambugu.cashier@myduka.com, Password: safe-password")
            print("  Email: jane.cashier@myduka.com, Password: cashier123")
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