import sys
import os

# Add the project root to the Python path to allow for 'app' module import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Store, Category, Product, StoreProduct, Supplier, Purchase, PurchaseItem, Sale, SaleItem # Import all necessary models
from app.auth.utils import hash_password # Ensure this is correctly imported
from decimal import Decimal
from datetime import date, datetime, timedelta

app = create_app()

with app.app_context():
    print("Clearing existing data...")
    # Order of deletion is important due to foreign key constraints
    db.session.query(SaleItem).delete()
    db.session.query(Sale).delete()
    db.session.query(PurchaseItem).delete()
    db.session.query(Purchase).delete()
    db.session.query(Supplier).delete()
    db.session.query(StoreProduct).delete()
    db.session.query(Product).delete()
    db.session.query(Category).delete()
    db.session.query(User).delete()
    db.session.query(Store).delete()
    db.session.commit() # Commit deletions

    print("Creating Stores...")
    store_downtown = Store(name="Downtown Store", address="Moi Avenue, Nairobi")
    store_uptown = Store(name="Uptown Branch", address="Kimathi Street, Nairobi")
    db.session.add_all([store_downtown, store_uptown])
    db.session.flush() # Flush to assign IDs to stores

    print("Creating Users...")
    merchant_downtown = User(
        name="Victor Merchant",
        email="merchant@myduka.com",
        password="merchant123", # Password passed to __init__
        role="merchant",
        store_id=store_downtown.id
    )
    admin_main = User(
        name="Admin User",
        email="admin@myduka.com",
        password="admin123",
        role="admin" # Admin might not be tied to a specific store initially
    )
    cashier_downtown = User(
        name="Jane Cashier",
        email="jane@myduka.com",
        password="cashier123",
        role="cashier",
        store_id=store_downtown.id
    )
    clerk_uptown = User(
        name="Peter Clerk",
        email="peter@myduka.com",
        password="clerk123",
        role="clerk",
        store_id=store_uptown.id
    )
    db.session.add_all([merchant_downtown, admin_main, cashier_downtown, clerk_uptown])
    db.session.flush() # Flush to get user IDs for created_by reference

    # Update merchant and clerk with created_by (if you want to track this in seed)
    merchant_downtown.created_by = admin_main.id
    cashier_downtown.created_by = merchant_downtown.id
    clerk_uptown.created_by = admin_main.id
    db.session.add_all([merchant_downtown, cashier_downtown, clerk_uptown])


    print("Creating Categories...")
    cat_fruits = Category(name="Fruits", description="Fresh fruits")
    cat_vegetables = Category(name="Vegetables", description="Fresh vegetables")
    cat_dairy = Category(name="Dairy & Eggs", description="Milk, cheese, yogurt, and eggs")
    db.session.add_all([cat_fruits, cat_vegetables, cat_dairy])
    db.session.flush()

    print("Creating Products...")
    prod_apples = Product(name="Apples", sku="FRT001", unit="kg", description="Sweet Red Apples", category=cat_fruits)
    prod_oranges = Product(name="Oranges", sku="FRT002", unit="kg", description="Juicy Oranges", category=cat_fruits)
    prod_milk = Product(name="Milk (Full Cream)", sku="DRY001", unit="Liter", description="Fresh full cream milk", category=cat_dairy)
    prod_carrots = Product(name="Carrots", sku="VEG001", unit="kg", description="Fresh Carrots", category=cat_vegetables)
    db.session.add_all([prod_apples, prod_oranges, prod_milk, prod_carrots])
    db.session.flush()

    print("Creating StoreProducts (Inventory)...")
    sp_d_apples = StoreProduct(store=store_downtown, product=prod_apples, quantity_in_stock=100, price=Decimal("150.00"), low_stock_threshold=20)
    sp_d_oranges = StoreProduct(store=store_downtown, product=prod_oranges, quantity_in_stock=75, price=Decimal("180.00"), low_stock_threshold=15)
    sp_d_milk = StoreProduct(store=store_downtown, product=prod_milk, quantity_in_stock=50, price=Decimal("70.00"), low_stock_threshold=10)
    
    sp_u_apples = StoreProduct(store=store_uptown, product=prod_apples, quantity_in_stock=80, price=Decimal("160.00"), low_stock_threshold=25)
    sp_u_carrots = StoreProduct(store=store_uptown, product=prod_carrots, quantity_in_stock=60, price=Decimal("90.00"), low_stock_threshold=10)
    db.session.add_all([sp_d_apples, sp_d_oranges, sp_d_milk, sp_u_apples, sp_u_carrots])
    db.session.flush()

    print("Creating Suppliers...")
    supp_fresh = Supplier(name="Fresh Produce Co.", contact_person="John Doe", phone="111222333", email="john@fresh.com", address="Industrial Area")
    supp_dairy = Supplier(name="Daily Dairy Farms", contact_person="Jane Smith", phone="444555666", email="jane@dairy.com", address="Ruiru")
    db.session.add_all([supp_fresh, supp_dairy])
    db.session.flush()

    print("Creating Purchases...")
    purchase1 = Purchase(supplier=supp_fresh, store=store_downtown, date=date.today() - timedelta(days=7), reference_number="PO001", is_paid=True, notes="Weekly fruit order")
    purchase2 = Purchase(supplier=supp_dairy, store=store_downtown, date=date.today() - timedelta(days=3), reference_number="PO002", is_paid=False, notes="Milk delivery")
    db.session.add_all([purchase1, purchase2])
    db.session.flush()

    print("Creating PurchaseItems...")
    pi1_apples = PurchaseItem(purchase=purchase1, product=prod_apples, quantity=50, unit_cost=Decimal("100.00"))
    pi1_oranges = PurchaseItem(purchase=purchase1, product=prod_oranges, quantity=30, unit_cost=Decimal("130.00"))
    pi2_milk = PurchaseItem(purchase=purchase2, product=prod_milk, quantity=40, unit_cost=Decimal("50.00"))
    db.session.add_all([pi1_apples, pi1_oranges, pi2_milk])
    db.session.flush()

    print("Creating Sales...")
    sale1_downtown = Sale(store=store_downtown, cashier=cashier_downtown, payment_status="paid")
    sale2_downtown = Sale(store=store_downtown, cashier=cashier_downtown, payment_status="unpaid")
    sale3_uptown = Sale(store=store_uptown, cashier=clerk_uptown, payment_status="paid") # Clerk as cashier role assumed
    db.session.add_all([sale1_downtown, sale2_downtown, sale3_uptown])
    db.session.flush()

    print("Creating SaleItems...")
    # Sale 1 items (Downtown)
    si1_d_apples = SaleItem(sale=sale1_downtown, store_product=sp_d_apples, quantity=5, price_at_sale=sp_d_apples.price)
    si1_d_oranges = SaleItem(sale=sale1_downtown, store_product=sp_d_oranges, quantity=3, price_at_sale=sp_d_oranges.price)
    db.session.add_all([si1_d_apples, si1_d_oranges])
    # Note: Stock deduction for these items would typically happen in the create_sale service
    # For seeding, we're just creating the records; actual stock updates should be via the service methods.
    # To reflect reality, you might manually adjust stock here if not using the service to seed.
    # For now, we'll keep it simple as a seed file primarily for data existence.

    # Sale 2 items (Downtown - unpaid)
    si2_d_milk = SaleItem(sale=sale2_downtown, store_product=sp_d_milk, quantity=2, price_at_sale=sp_d_milk.price)
    db.session.add(si2_d_milk)

    # Sale 3 items (Uptown)
    si3_u_apples = SaleItem(sale=sale3_uptown, store_product=sp_u_apples, quantity=4, price_at_sale=sp_u_apples.price)
    db.session.add(si3_u_apples)

    db.session.commit()
    print("Seeding complete!")