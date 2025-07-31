import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Store, Supplier, Product, Purchase, PurchaseItem

def seed_auth():
    app = create_app()

    with app.app_context():
        print("🌱 Seeding initial test data...")

        # Create store
        store = Store(name="Main Store", address="123 Nairobi Road")
        db.session.add(store)
        db.session.commit()

        # Create merchant
        merchant = User(
            name="Admin User",
            email="myduka213@gmail.com",
            password="rycqjmzsasmahkxj",  # plain password; User.__init__ hashes it
            role="merchant",
            store_id=store.id,
            is_active=True
        )
        db.session.add(merchant)

        # Create admin under same store
        admin = User(
            name="Store Admin",
            email="admin@example.com",
            password="admin123",
            role="admin",
            store_id=store.id,
            is_active=True
        )
        db.session.add(admin)

        # Create supplier
        supplier = Supplier(name="ABC Suppliers", contact_info="abc@example.com")
        db.session.add(supplier)
        
        # Create products
        product1 = Product(
            name="Soda",
            unit="bottle", 
            buying_price=20,
            selling_price=30,
            )
        
        product2 = Product(
            name="Bread",
            unit="loaf", 
            buying_price=30,
            selling_price=50,
            )
        
        db.session.add_all([product1, product2])
        db.session.commit()
        
        # ✅ Link products to store with stock via StoreProduct
        store_product1 = StoreProduct(store_id=store.id, product_id=product1.id, quantity=50)
        store_product2 = StoreProduct(store_id=store.id, product_id=product2.id, quantity=30)
        db.session.add_all([store_product1, store_product2])
        db.session.commit()

        # Create a purchase
        purchase = Purchase(
            store_id=store.id,
            supplier_id=supplier.id,
            is_paid=False,
            payment_status="unpaid",
            notes="Initial supply"
        )
        db.session.add(purchase)
        db.session.commit()

        # Add items to the purchase
        item1 = PurchaseItem(purchase_id=purchase.id, product_id=product1.id, quantity=10, unit_cost=20)
        item2 = PurchaseItem(purchase_id=purchase.id, product_id=product2.id, quantity=5, unit_cost=40)
        db.session.add_all([item1, item2])
        db.session.commit()

        print("✅ Seeding complete.")
        print("📧 Email: myduka213@gmail.com")
        print("🔑 Password: rycqjmzsasmahkxj")

if __name__ == "__main__":
    seed_auth()
