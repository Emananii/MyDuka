from app import create_app, db
from app.models import (
    Store, Category, Product,
    Supplier, Purchase, PurchaseItem,
    StoreProduct, User
)
from datetime import datetime
from werkzeug.security import generate_password_hash
import os

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
        beverages = Category(name="Beverages", description="Soft drinks, water, juices")
        snacks = Category(name="Snacks", description="Biscuits, chips, chocolate bars")
        db.session.add_all([beverages, snacks])
        db.session.commit()

        # --- Create Products ---
        coke = Product(name="Coca-Cola 500ml", sku="COKE500", unit="bottle", description="Soft drink", category_id=beverages.id)
        fanta = Product(name="Fanta Orange 500ml", sku="FANTA500", unit="bottle", description="Orange soft drink", category_id=beverages.id)
        pepsi = Product(name="Pepsi 500ml", sku="PEPSI500", unit="bottle", description="Cola drink", category_id=beverages.id)
        lays = Product(name="Lays Chips", sku="LAYS100", unit="pack", description="Salted chips", category_id=snacks.id)
        db.session.add_all([coke, fanta, pepsi, lays])
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
        item1 = PurchaseItem(purchase_id=purchase1.id, product_id=coke.id, quantity=100, unit_cost=25.00)
        item2 = PurchaseItem(purchase_id=purchase1.id, product_id=lays.id, quantity=60, unit_cost=30.00)
        db.session.add_all([item1, item2])
        db.session.commit()

        # --- Create Stock Records ---
        stock1 = StoreProduct(store_id=store1.id, product_id=coke.id, quantity_in_stock=100, low_stock_threshold=10)
        stock2 = StoreProduct(store_id=store1.id, product_id=lays.id, quantity_in_stock=60, low_stock_threshold=5)
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
            password_digest=generate_password_hash("merchant123"),
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
