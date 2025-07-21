import sys
import os

# Add the project root to the Python path to allow for 'app' module import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Store, User, Category, Product, StoreProduct, Sale, SaleItem
from decimal import Decimal
from datetime import datetime
import random

def seed_sales():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # --- Store ---
        store = Store(name="Duka Moja", address="Nairobi CBD")
        db.session.add(store)
        db.session.commit()

        # --- User (Cashier) ---
        cashier = User(
            name="Wambugu Cashier",
            email="cashier@myduka.com",
            password="safe-password",
            role="cashier",
            store_id=store.id
        )
        db.session.add(cashier)
        db.session.commit()

        # --- Category ---
        category = Category(name="Electronics", description="Electronic devices and accessories")
        db.session.add(category)
        db.session.commit()

        # --- Products ---
        product_data = [
            {"name": "Wireless Mouse", "sku": "WM123", "unit": "pcs", "price": "1200.00"},
            {"name": "Keyboard", "sku": "KB456", "unit": "pcs", "price": "2500.00"},
            {"name": "HDMI Cable", "sku": "HD789", "unit": "pcs", "price": "800.00"},
            {"name": "USB Hub", "sku": "UH321", "unit": "pcs", "price": "1500.00"},
        ]

        store_products = [] # This will hold the StoreProduct objects for creating sales
        
        for pd in product_data:
            product = Product(
                name=pd["name"],
                sku=pd["sku"],
                unit=pd["unit"],
                category_id=category.id,
                description=f"{pd['name']} description"
            )
            db.session.add(product)
            db.session.flush()  # Get product.id before committing

            # --- StoreProduct (stock level for store) ---
            sp = StoreProduct(
                store_id=store.id,
                product_id=product.id,
                price=Decimal(pd['price']), # Set the price for the store product
                quantity_in_stock=random.randint(10, 100),
                low_stock_threshold=5
            )
            db.session.add(sp)
            store_products.append(sp) # Append the StoreProduct object, not the Product

        db.session.commit()

        # --- Sales ---
        for i in range(3):  # Create 3 sales
            sale = Sale(
                store_id=store.id,
                cashier_id=cashier.id,
                payment_status="paid",
                created_at=datetime.utcnow()
            )
            db.session.add(sale)
            db.session.flush()

            # Add 1–3 random items per sale
            selected_store_products = random.sample(store_products, k=random.randint(1, min(3, len(store_products))))
            for store_product in selected_store_products:
                item = SaleItem(
                    sale_id=sale.id,
                    store_product_id=store_product.id, # Use the StoreProduct's ID
                    quantity=random.randint(1, 5),
                    price_at_sale=store_product.price # Use the actual price from the StoreProduct
                )
                db.session.add(item)

        db.session.commit()
        print("✅ Seeded sales data successfully.")

if __name__ == "__main__":
    seed_sales()
