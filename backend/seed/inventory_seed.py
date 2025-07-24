import sys
import os
from datetime import datetime
from faker import Faker
import random
from decimal import Decimal # <--- ADD THIS IMPORT

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import (
    Store, Category, Product,
    Supplier, Purchase, PurchaseItem,
    StoreProduct, User
)


faker = Faker()

app = create_app()

with app.app_context():
    print("Loaded DATABASE_URI:", os.getenv("DATABASE_URI"))
    print("Resetting database...")
    try:
        db.drop_all()
        print("✅ drop_all() successful")

        db.create_all()
        print("✅ create_all() successful")

    except Exception as e:
        print(" Error during schema reset:", e)
        raise

    try:
        # --- Create Stores ---
        store1 = Store(name="Main Branch (CBD)", address="Tom Mboya Street, Nairobi")
        store2 = Store(name="Westlands Branch", address="Westlands Rd, Nairobi")
        db.session.add_all([store1, store2])
        db.session.commit()
        print(f"✅ Created {Store.query.count()} initial stores.")

        # --- Define realistic products and categories ---
        base_products = [
            ("Milk", "Dairy", "packet"),
            ("Yogurt", "Dairy", "cup"),
            ("Cheese", "Dairy", "block"),
            ("Bread", "Bakery", "loaf"),
            ("Cake", "Bakery", "piece"),
            ("Buns", "Bakery", "pack"),
            ("Toilet Paper", "Household", "roll"),
            ("Soap", "Cleaning Supplies", "bar"),
            ("Detergent", "Cleaning Supplies", "box"),
            ("Dishwasher", "Cleaning Supplies", "bottle"),
            ("Soda", "Beverages", "bottle"),
            ("Juice", "Beverages", "carton"),
            ("Water", "Beverages", "bottle"),
            ("Biscuits", "Snacks", "pack"),
            ("Chips", "Snacks", "packet"),
            ("Cookies", "Snacks", "pack"),
            ("Rice", "Grocery", "kg"),
            ("Flour", "Grocery", "kg"),
            ("Sugar", "Grocery", "kg"),
            ("Tomatoes", "Vegetables", "kg"),
            ("Onions", "Vegetables", "kg"),
            ("Cabbage", "Vegetables", "head"),
        ]

        # Generate more by repeating and randomizing names
        product_list = []
        while len(product_list) < 50:
            name, cat, unit = random.choice(base_products)
            new_name = name + " " + faker.word().capitalize()
            product_list.append((new_name, cat, unit))

        # Create categories
        category_names = set([cat for _, cat, _ in product_list])
        categories = []
        # Ensure enough categories for product variety
        for _ in range(10): # Reduced number for more likely product per category
            name = faker.unique.word().capitalize()
            description = faker.sentence(nb_words=5)
            category = Category(name=name, description=description)
            categories.append(category)

        db.session.add_all(categories)
        db.session.commit()
        print(f"✅ Created {Category.query.count()} categories.")

        # Create products
        products = []
        # Create a good number of products, ensuring they are linked to categories
        for _ in range(50): # Increased product count for better testing
            category = random.choice(categories)
            name = faker.unique.company() + " " + faker.word().capitalize()
            sku = faker.unique.bothify(text='???###').upper()
            unit = random.choice(["piece", "box", "bottle", "pack", "kg", "g", "ml", "L"])
            description = faker.sentence(nb_words=6)

            product = Product(
                name=name,
                sku=faker.unique.bothify(text='???###').upper(),
                unit=unit,
                description=faker.text(max_nb_chars=40),
                category_id=category_map[category_name].id
            )
            products.append(product)

        db.session.add_all(products)
        db.session.commit()
        print(f"✅ Created {Product.query.count()} products.")


        # --- Create Supplier ---
        supplier1 = Supplier(
            name="ABC Distributors",
            contact_person="Jane Doe",
            phone="0700123456",
            email="abc@distributors.com",
            address="Industrial Area, Nairobi"
        )
        db.session.add(supplier1)
        db.session.commit()
        print(f"✅ Created {Supplier.query.count()} supplier.")

        # --- Create Purchase ---
        purchase1 = Purchase(
            supplier_id=supplier1.id,
            store_id=store1.id,
            date=datetime(2025, 7, 15),
            reference_number="PO-1001",
            is_paid=True,
            notes="First delivery for beverages and snacks"
        )
        db.session.add(purchase1)
        db.session.flush()

        # --- Create Purchase Items ---
        # Ensure these products exist before referencing them
        # Use products that will also be in StoreProduct to avoid inconsistencies
        product_sample_for_purchase = random.sample(products, 2) # Get two random products from the main list
        item1 = PurchaseItem(
            purchase_id=purchase1.id,
            product_id=product_sample_for_purchase[0].id,
            quantity=100,
            unit_cost=Decimal('25.00') # <--- Ensure unit_cost is Decimal if directly set
        )
        item2 = PurchaseItem(
            purchase_id=purchase1.id,
            product_id=product_sample_for_purchase[1].id,
            quantity=60,
            unit_cost=Decimal('30.00') # <--- Ensure unit_cost is Decimal if directly set
        )
        db.session.add_all([item1, item2])
        db.session.commit()
        print(f"✅ Created {Purchase.query.count()} purchase with {PurchaseItem.query.count()} items.")


        # --- Create StoreProduct Records (Inventory Stock with Prices) ---
        all_stores = Store.query.all() # Get all stores, including the ones just created
        all_products = Product.query.all() # Get all products

        store_products_to_seed = []
        for store in all_stores:
            # Seed a good number of products for each store
            num_products_per_store = random.randint(min(10, len(all_products)), min(25, len(all_products)))
            products_for_store = random.sample(all_products, num_products_per_store)

            for product in products_for_store:
                # Generate realistic data for StoreProduct
                quantity_in_stock = random.randint(0, 200) # Can be 0 for out of stock
                # Ensure price is distinct from purchase cost, and realistic
                # Simple rule: sell price is 1.2 to 2.5 times cost (assuming a theoretical average cost of 50-200)
                # Use Decimal() for all monetary calculations
                base_price = Decimal(str(round(random.uniform(50, 500), 2))) # Convert float to Decimal via string
                price = (base_price * Decimal(str(random.uniform(1.2, 2.5)))).quantize(Decimal('0.01')) # Quantize to 2 decimal places
                low_stock_threshold = random.randint(5, 50)
                last_updated = faker.date_time_between(start_date='-60d', end_date='now', tzinfo=None)

                store_product = StoreProduct(
                    store_id=store.id,
                    product_id=product.id,
                    quantity_in_stock=quantity_in_stock,
                    price=price, # CRUCIAL: Added price here
                    low_stock_threshold=low_stock_threshold,
                    last_updated=last_updated
                )
                store_products_to_seed.append(store_product)

        # Add the two specific stock records from your original seed (if they don't clash)
        stock1 = StoreProduct(
            store_id=store1.id,
            product_id=product_sample_for_purchase[0].id,
            quantity_in_stock=100,
            low_stock_threshold=10,
            price=(item1.unit_cost * Decimal('1.5')).quantize(Decimal('0.01')), # <--- FIXED
            last_updated=datetime.now()
        )
        stock2 = StoreProduct(
            store_id=store1.id,
            product_id=product_sample_for_purchase[1].id,
            quantity_in_stock=60,
            low_stock_threshold=5,
            price=(item2.unit_cost * Decimal('1.8')).quantize(Decimal('0.01')), # <--- FIXED
            last_updated=datetime.now()
        )

        # Remove potential duplicates from store_products_to_seed before adding specific ones
        unique_store_products = {}
        for sp in store_products_to_seed:
            unique_store_products[(sp.store_id, sp.product_id)] = sp

        # Add specific ones, overwriting if they were generated
        unique_store_products[(stock1.store_id, stock1.product_id)] = stock1
        unique_store_products[(stock2.store_id, stock2.product_id)] = stock2

        db.session.add_all(unique_store_products.values())
        db.session.commit()
        print(f"✅ Created {StoreProduct.query.count()} StoreProduct records (inventory stock) with prices.")

        # --- Add a sample user and store ---
        downtown_store_for_merchant = Store.query.filter_by(name="Downtown Store").first()
        if not downtown_store_for_merchant:
            downtown_store_for_merchant = Store(name="Downtown Store", address="Moi Avenue, Nairobi")
            db.session.add(downtown_store_for_merchant)
            db.session.flush() # Ensure ID is assigned

        # Create specific users for testing different roles
        users_to_seed = []
        users_to_seed.append(User(
            name="Victor Merchant",
            email="merchant@myduka.com",
            password="merchant123", # Password will be hashed by model's setter
            role="merchant",
            store_id=store1.id # Associate merchant with store1
        ))
        users_to_seed.append(User(
            name="Alice Admin",
            email="admin@myduka.com",
            password="admin123",
            role="admin",
            store_id=None # Admins might not be tied to a specific store initially
        ))
        users_to_seed.append(User(
            name="Bob Cashier",
            email="cashier@myduka.com",
            password="cashier123",
            role="cashier",
            store_id=store1.id # Cashier for store1
        ))
        users_to_seed.append(User(
            name="Carol Clerk",
            email="clerk@myduka.com",
            password="clerk123",
            role="clerk",
            store_id=store2.id # Clerk for store2
        ))

        db.session.add_all(users_to_seed)
        db.session.commit()
        print(f"✅ Created {User.query.count()} users with different roles.")


        print("\n--- Seeding Summary ---")
        print(f"📦 Total stores: {Store.query.count()}")
        print(f"🛒 Total categories: {Category.query.count()}")
        print(f"🧺 Total products: {Product.query.count()}")
        print(f"👤 Total users: {User.query.count()}")
        print(f"🏢 Total suppliers: {Supplier.query.count()}")
        print(f"📃 Total purchases: {Purchase.query.count()}")
        print(f"🛍️ Total purchase items: {PurchaseItem.query.count()}")
        print(f"📊 Total StoreProduct inventory records: {StoreProduct.query.count()}")
        print("✅ All data seeded successfully.")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error during seeding: {e}")
        # Optionally, print traceback for debugging
        import traceback
        traceback.print_exc()

    finally:
        db.session.close()
