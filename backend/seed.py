from app import create_app, db
from app.models import (
    Store, Category, Product,
    Supplier, Purchase, PurchaseItem,
    StoreProduct
)
from datetime import datetime

app = create_app()

with app.app_context():
    print("Resetting database...")
    db.drop_all()
    db.create_all()

    # Create Stores 
    store1 = Store(name="Main Branch", address="Tom Mboya Street")
    store2 = Store(name="Westlands Branch", address="Westlands Rd")
    db.session.add_all([store1, store2])
    db.session.commit()

    # Create Categories
    beverages = Category(name="Beverages", description="Soft drinks, water, juices")
    snacks = Category(name="Snacks", description="Biscuits, chips, chocolate bars")
    db.session.add_all([beverages, snacks])
    db.session.commit()

    # Create Products 
    coke = Product(name="Coca-Cola 500ml", sku="COKE500", unit="bottle", description="Soft drink", category_id=beverages.id)
    fanta = Product(name="Fanta Orange 500ml", sku="FANTA500", unit="bottle", description="Orange soft drink", category_id=beverages.id)
    pepsi = Product(name="Pepsi 500ml", sku="PEPSI500", unit="bottle", description="Cola drink", category_id=beverages.id)
    lays = Product(name="Lays Chips", sku="LAYS100", unit="pack", description="Salted chips", category_id=snacks.id)
    db.session.add_all([coke, fanta, lays, pepsi])
    db.session.commit()

    # Create Supplier 
    supplier1 = Supplier(name="ABC Distributors", contact_person="Jane Doe", phone="0700123456", email="abc@distributors.com", address="Industrial Area")
    db.session.add(supplier1)
    db.session.commit()

    # Create Purchase 
    purchase1 = Purchase(
        supplier_id=supplier1.id,
        store_id=store1.id,
        date=datetime(2025, 7, 15),
        reference_number="PO-1001",
        is_paid=True,
        notes="First delivery for beverages and snacks"
    )
    db.session.add(purchase1)
    db.session.flush()  # Get purchase1.id

    # Create Purchase Items
    item1 = PurchaseItem(purchase_id=purchase1.id, product_id=coke.id, quantity=100, unit_cost=25.00)
    item2 = PurchaseItem(purchase_id=purchase1.id, product_id=lays.id, quantity=60, unit_cost=30.00)
    db.session.add_all([item1, item2])
    db.session.commit()

    # Create StoreProduct Stock Records 
    stock1 = StoreProduct(store_id=store1.id, product_id=coke.id, quantity_in_stock=100, low_stock_threshold=10)
    stock2 = StoreProduct(store_id=store1.id, product_id=lays.id, quantity_in_stock=60, low_stock_threshold=5)
    db.session.add_all([stock1, stock2])
    db.session.commit()

    print("Seed data created for Inventory Management.")
