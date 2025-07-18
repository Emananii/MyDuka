# import pytest
# from decimal import Decimal
# from app import db
# from app.models import Store, User, Category, Product, Purchase, PurchaseItem, StoreProduct, SupplyRequest, StockTransfer, StockTransferItem
# from flask_jwt_extended import create_access_token


# @pytest.fixture
# def setup_inventory_data(app):
#     """
#     Sets up test data for inventory tests: a store, categories, and products.
#     """
#     with app.app_context():
#         # Clear existing data to ensure a clean state for each test
#         db.session.query(User).delete()
#         db.session.query(Store).delete()
#         db.session.query(Category).delete()
#         db.session.query(Product).delete()
#         db.session.query(Purchase).delete()
#         db.session.query(PurchaseItem).delete()
#         db.session.query(StoreProduct).delete()
#         db.session.query(SupplyRequest).delete()
#         db.session.query(StockTransfer).delete()
#         db.session.query(StockTransferItem).delete()
#         db.session.commit()

#         store = Store(name="Inventory Test Store", address="789 Inventory Rd")
#         db.session.add(store)
#         db.session.commit()

#         # Create users with different roles for potential future use or if needed by fixtures
#         merchant_user = User(
#             name="Inv Merchant",
#             email="inv_merchant@test.com",
#             password="password123",
#             role="merchant",
#             store_id=store.id
#         )
#         admin_user = User(
#             name="Inv Admin",
#             email="inv_admin@test.com",
#             password="password123",
#             role="admin",
#             store_id=store.id
#         )
#         db.session.add_all([merchant_user, admin_user])
#         db.session.commit()

#         # Generate access tokens for authenticated users
#         merchant_token = create_access_token(identity=merchant_user.id)
#         admin_token = create_access_token(identity=admin_user.id)


#         # Create categories
#         category1 = Category(name="Electronics", description="Electronic gadgets")
#         category2 = Category(name="Books", description="Reading materials")
#         db.session.add_all([category1, category2])
#         db.session.commit()

#         # Create products
#         product1 = Product(name="Laptop", description="High-end laptop", category_id=category1.id, unit="pcs", sku="LPT-001")
#         product2 = Product(name="Smartphone", description="Latest smartphone", category_id=category1.id, unit="pcs", sku="SMT-002")
#         product3 = Product(name="Novel", description="Fiction novel", category_id=category2.id, unit="units", sku="NVL-001")
#         db.session.add_all([product1, product2, product3])
#         db.session.commit()

#         # Create StoreProducts (initial stock)
#         store_product1 = StoreProduct(store_id=store.id, product_id=product1.id, quantity_in_stock=10, low_stock_threshold=2)
#         store_product2 = StoreProduct(store_id=store.id, product_id=product2.id, quantity_in_stock=5, low_stock_threshold=1)
#         db.session.add_all([store_product1, store_product2])
#         db.session.commit()

#         return {
#             "store": store,
#             "merchant_user": merchant_user,
#             "admin_user": admin_user,
#             "merchant_token": merchant_token,
#             "admin_token": admin_token,
#             "category1": category1,
#             "category2": category2,
#             "product1": product1,
#             "product2": product2,
#             "product3": product3,
#             "store_product1": store_product1,
#             "store_product2": store_product2,
#         }


# # ======================================================================
# # --- Inventory Route Tests ---
# # ======================================================================

# # --- Category Tests ---
# def test_get_categories(client, setup_inventory_data):
#     """Tests retrieving all categories."""
#     response = client.get("/api/inventory/categories")
#     assert response.status_code == 200
#     assert len(response.json) >= 2 # At least the two categories from setup
#     assert any(c['name'] == 'Electronics' for c in response.json)
#     assert any(c['name'] == 'Books' for c in response.json)

# def test_create_category_success(client, app):
#     """Tests successful creation of a new category."""
#     with app.app_context():
#         response = client.post("/api/inventory/categories", json={
#             "name": "New Category",
#             "description": "A brand new category"
#         })
#         assert response.status_code == 201
#         assert response.json["name"] == "New Category"
#         assert response.json["description"] == "A brand new category"
#         assert response.json["id"] is not None

#         # Verify in DB
#         category = db.session.get(Category, response.json["id"])
#         assert category is not None
#         assert category.name == "New Category"

# def test_create_category_missing_name(client):
#     """Tests creating a category with a missing name."""
#     response = client.post("/api/inventory/categories", json={
#         "description": "Category without a name"
#     })
#     assert response.status_code == 400 # Assuming your error handler returns 400 for missing data

# def test_update_category_success(client, setup_inventory_data):
#     """Tests successful update of an existing category."""
#     category1 = setup_inventory_data["category1"]
#     response = client.patch(f"/api/inventory/categories/{category1.id}", json={
#         "name": "Updated Electronics",
#         "description": "Updated description for electronics"
#     })
#     assert response.status_code == 200
#     assert response.json["name"] == "Updated Electronics"
#     assert response.json["description"] == "Updated description for electronics"

#     # Verify in DB
#     updated_category = db.session.get(Category, category1.id)
#     assert updated_category.name == "Updated Electronics"

# def test_update_category_not_found(client):
#     """Tests updating a non-existent category."""
#     response = client.patch("/api/inventory/categories/9999", json={
#         "name": "Non Existent"
#     })
#     assert response.status_code == 404

# def test_delete_category_success(client, setup_inventory_data):
#     """Tests successful soft deletion of a category."""
#     category2 = setup_inventory_data["category2"]
#     response = client.delete(f"/api/inventory/categories/{category2.id}")
#     assert response.status_code == 200
#     assert response.json["message"] == "Category deleted"

#     # Verify in DB that it's soft-deleted
#     deleted_category = db.session.get(Category, category2.id)
#     assert deleted_category.is_deleted == True

# def test_delete_category_not_found(client):
#     """Tests deleting a non-existent category."""
#     response = client.delete("/api/inventory/categories/9999")
#     assert response.status_code == 404

# # --- Product Tests ---
# def test_get_products(client, setup_inventory_data):
#     """Tests retrieving all products."""
#     response = client.get("/api/inventory/products")
#     assert response.status_code == 200
#     assert len(response.json) >= 3 # At least the three products from setup
#     assert any(p['name'] == 'Laptop' for p in response.json)
#     assert any(p['name'] == 'Smartphone' for p in response.json)

# def test_create_product_success(client, app, setup_inventory_data):
#     """Tests successful creation of a new product."""
#     category1 = setup_inventory_data["category1"]
#     with app.app_context():
#         response = client.post("/api/inventory/products", json={
#             "name": "New Product",
#             "description": "A brand new product",
#             "category_id": category1.id,
#             "unit": "units",
#             "sku": "NP-001"
#         })
#         assert response.status_code == 201
#         assert response.json["name"] == "New Product"
#         assert response.json["category_id"] == category1.id
#         assert response.json["id"] is not None

#         # Verify in DB
#         product = db.session.get(Product, response.json["id"])
#         assert product is not None
#         assert product.name == "New Product"

# def test_create_product_missing_fields(client):
#     """Tests creating a product with missing required fields."""
#     response = client.post("/api/inventory/products", json={
#         "name": "Incomplete Product"
#         # category_id, unit are missing
#     })
#     assert response.status_code == 400 # Assuming your error handler returns 400 for missing data

# def test_update_product_success(client, setup_inventory_data):
#     """Tests successful update of an existing product."""
#     product1 = setup_inventory_data["product1"]
#     category2 = setup_inventory_data["category2"]
#     response = client.patch(f"/api/inventory/products/{product1.id}", json={
#         "name": "Updated Laptop",
#         "category_id": category2.id,
#         "unit": "items"
#     })
#     assert response.status_code == 200
#     assert response.json["name"] == "Updated Laptop"
#     assert response.json["category_id"] == category2.id
#     assert response.json["unit"] == "items"

#     # Verify in DB
#     updated_product = db.session.get(Product, product1.id)
#     assert updated_product.name == "Updated Laptop"
#     assert updated_product.category_id == category2.id

# def test_update_product_not_found(client):
#     """Tests updating a non-existent product."""
#     response = client.patch("/api/inventory/products/9999", json={
#         "name": "Non Existent Product"
#     })
#     assert response.status_code == 404

# def test_delete_product_success(client, setup_inventory_data):
#     """Tests successful soft deletion of a product."""
#     product2 = setup_inventory_data["product2"]
#     response = client.delete(f"/api/inventory/products/{product2.id}")
#     assert response.status_code == 200
#     assert response.json["message"] == "Product deleted"

#     # Verify in DB that it's soft-deleted
#     deleted_product = db.session.get(Product, product2.id)
#     assert deleted_product.is_deleted == True

# def test_delete_product_not_found(client):
#     """Tests deleting a non-existent product."""
#     response = client.delete("/api/inventory/products/9999")
#     assert response.status_code == 404

# # --- Purchase Tests ---
# def test_create_purchase_success(client, app, setup_inventory_data):
#     """Tests successful creation of a new purchase."""
#     store = setup_inventory_data["store"]
#     product1 = setup_inventory_data["product1"]
#     product2 = setup_inventory_data["product2"]

#     with app.app_context():
#         response = client.post("/api/inventory/purchases", json={
#             "supplier_id": 1,
#             "store_id": store.id,
#             "date": "2023-07-20",
#             "reference_number": "PO-TEST-001",
#             "is_paid": True,
#             "notes": "Test purchase order",
#             "items": [
#                 {"product_id": product1.id, "quantity": 5, "unit_cost": 100.00},
#                 {"product_id": product2.id, "quantity": 3, "unit_cost": 50.00}
#             ]
#         })
#         assert response.status_code == 201
#         assert response.json["id"] is not None
#         assert response.json["store_id"] == store.id
#         # Add more assertions based on your Purchase.to_dict() output

#         # Verify in DB
#         purchase = db.session.get(Purchase, response.json["id"])
#         assert purchase is not None
#         assert len(purchase.purchase_items) == 2

# def test_create_purchase_missing_fields(client):
#     """Tests creating a purchase with missing required fields."""
#     response = client.post("/api/inventory/purchases", json={
#         "supplier_id": 1,
#         # store_id and items are missing
#     })
#     assert response.status_code == 400 # Assuming your error handler returns 400

# def test_get_purchases(client, setup_inventory_data):
#     """Tests retrieving all purchases."""
#     store = setup_inventory_data["store"]
#     product1 = setup_inventory_data["product1"]

#     # Create a dummy purchase for retrieval
#     with client.application.app_context():
#         purchase = Purchase(
#             supplier_id=1,
#             store_id=store.id,
#             date="2023-07-19",
#             reference_number="PO-RETRIEVE-001",
#             is_paid=False
#         )
#         db.session.add(purchase)
#         db.session.flush()
#         purchase_item = PurchaseItem(
#             purchase_id=purchase.id,
#             product_id=product1.id,
#             quantity=2,
#             unit_cost=75.00
#         )
#         db.session.add(purchase_item)
#         db.session.commit()

#     response = client.get("/api/inventory/purchases")
#     assert response.status_code == 200
#     assert len(response.json) >= 1
#     assert any(p['reference_number'] == 'PO-RETRIEVE-001' for p in response.json)

# def test_filter_purchases(client, setup_inventory_data):
#     """Tests filtering purchases by supplier, store, and date."""
#     store = setup_inventory_data["store"]
#     product1 = setup_inventory_data["product1"]

#     with client.application.app_context():
#         # Create multiple purchases for filtering
#         purchase1 = Purchase(supplier_id=1, store_id=store.id, date="2023-07-20", reference_number="F-001")
#         purchase2 = Purchase(supplier_id=2, store_id=store.id, date="2023-07-20", reference_number="F-002")
#         purchase3 = Purchase(supplier_id=1, store_id=store.id + 1, date="2023-07-21", reference_number="F-003")
#         db.session.add_all([purchase1, purchase2, purchase3])
#         db.session.flush()
#         db.session.add(PurchaseItem(purchase_id=purchase1.id, product_id=product1.id, quantity=1, unit_cost=10))
#         db.session.add(PurchaseItem(purchase_id=purchase2.id, product_id=product1.id, quantity=1, unit_cost=10))
#         db.session.add(PurchaseItem(purchase_id=purchase3.id, product_id=product1.id, quantity=1, unit_cost=10))
#         db.session.commit()

#     # Filter by supplier_id
#     response = client.get(f"/api/inventory/purchases/filter?supplier_id=1")
#     assert response.status_code == 200
#     assert len(response.json) == 2
#     assert all(p['supplier_id'] == 1 for p in response.json)

#     # Filter by store_id
#     response = client.get(f"/api/inventory/purchases/filter?store_id={store.id}")
#     assert response.status_code == 200
#     assert len(response.json) == 2
#     assert all(p['store_id'] == store.id for p in response.json)

#     # Filter by date
#     response = client.get("/api/inventory/purchases/filter?date=2023-07-20")
#     assert response.status_code == 200
#     assert len(response.json) == 2
#     assert all(p['date'] == '2023-07-20' for p in response.json)

#     # Filter by multiple criteria
#     response = client.get(f"/api/inventory/purchases/filter?supplier_id=1&store_id={store.id}&date=2023-07-20")
#     assert response.status_code == 200
#     assert len(response.json) == 1
#     assert response.json[0]['reference_number'] == 'F-001'

# # --- Stock View Tests ---
# def test_get_stock_by_store(client, setup_inventory_data):
#     """Tests retrieving stock levels for a specific store."""
#     store = setup_inventory_data["store"]
#     product1 = setup_inventory_data["product1"]
#     product2 = setup_inventory_data["product2"]

#     response = client.get(f"/api/inventory/stock/{store.id}")
#     assert response.status_code == 200
#     assert len(response.json) == 2 # Based on store_product1 and store_product2
#     assert any(item['product_id'] == product1.id and item['quantity_in_stock'] == 10 for item in response.json)
#     assert any(item['product_id'] == product2.id and item['quantity_in_stock'] == 5 for item in response.json)

# def test_get_stock_by_store_not_found(client):
#     """Tests retrieving stock for a non-existent store."""
#     response = client.get("/api/inventory/stock/9999")
#     assert response.status_code == 200 # Returns empty list if store has no products or store doesn't exist
#     assert len(response.json) == 0
