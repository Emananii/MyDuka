import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import (
    Store, Category, Product,
    Supplier, Purchase, PurchaseItem,
    StoreProduct, User
)
from datetime import datetime
from faker import Faker
import random

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
        store1 = Store(name="Main Branch", address="Tom Mboya Street")
        store2 = Store(name="Westlands Branch", address="Westlands Rd")
        db.session.add_all([store1, store2])
        db.session.commit()

        # --- Create Categories ---
        categories = []
        for _ in range(30):
            name = faker.unique.word().capitalize() + "s"
            description = faker.sentence(nb_words=5)
            category = Category(name=name, description=description)
            categories.append(category)

        db.session.add_all(categories)
        db.session.commit()

        # --- Create Products ---
        products = []
        for _ in range(50):
            category = random.choice(categories)
            name = faker.unique.company() + " " + faker.word().capitalize()
            sku = faker.unique.bothify(text='???###').upper()
            unit = random.choice(["piece", "box", "bottle", "pack"])
            description = faker.sentence(nb_words=6)

            product = Product(
                name=name,
                sku=sku,
                unit=unit,
                description=description,
                category_id=category.id
            )
            products.append(product)

        db.session.add_all(products)
        db.session.commit()

        # --- Create Supplier ---
        supplier1 = Supplier(
            name="ABC Distributors",
            contact_person="Jane Doe",
            phone="0700123456",
            email="abc@distributors.com",
            address="Industrial Area"
        )
        db.session.add(supplier1)
        db.session.commit()

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
        db.session.flush()  # Needed to get purchase_id

        # --- Create Purchase Items ---
        product_sample = random.sample(products, 2)
        item1 = PurchaseItem(purchase_id=purchase1.id, product_id=product_sample[0].id, quantity=100, unit_cost=25.00)
        item2 = PurchaseItem(purchase_id=purchase1.id, product_id=product_sample[1].id, quantity=60, unit_cost=30.00)



        # --- Create Stock Records ---
        stock1 = StoreProduct(store_id=store1.id, product_id=product_sample[0].id, quantity_in_stock=100, low_stock_threshold=10)
        stock2 = StoreProduct(store_id=store1.id, product_id=product_sample[1].id, quantity_in_stock=60, low_stock_threshold=5)
        db.session.add_all([stock1, stock2])
        db.session.commit()

        print("✅ Inventory data seeded successfully.")

        # --- Add a sample user and store (WITHOUT deleting existing data) ---
        downtown_store = Store(name="Downtown Store", address="Moi Avenue")
        db.session.add(downtown_store)
        db.session.flush()

        merchant = User(
            name="Victor Merchant",
            email="merchant@myduka.com",
            password="merchant123",
            role="merchant",
            store_id=downtown_store.id
        )
        db.session.add(merchant)
        db.session.commit()

        print("✅ Merchant and store added.")

        # --- Print summary ---
        print(f"📦 Total stores: {Store.query.count()}")
        print(f"🛒 Total products: {Product.query.count()}")
        print(f"👤 Total users: {User.query.count()}")
        print(f"📃 Total purchases: {Purchase.query.count()}")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error during seeding: {e}")

    finally:
        db.session.close()