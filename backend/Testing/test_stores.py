# import pytest
# from datetime import datetime, timedelta, timezone
# from app import db
# from app.models import (
#     User, Store, Category, Product, StoreProduct,
#     SupplyRequest, SupplyRequestStatus, StockTransfer, StockTransferItem, StockTransferStatus
# )
# from flask_jwt_extended import create_access_token
# from decimal import Decimal
# import json

# # --- Helper Functions ---

# def create_test_auth_data(app, role="admin"):
#     """
#     Creates a base store and a user associated with that store for authentication.
#     This data is added to the session and flushed to get IDs, but NOT committed.
#     The session fixture's rollback will clean it up.
#     Returns the IDs of the created store and user.
#     """
#     with app.app_context():
#         # No need to delete here; the session fixture's db.drop_all() ensures a clean slate.
#         # db.session.query(User).delete()
#         # db.session.query(Store).delete()
#         # db.session.commit() # Do NOT commit here.

#         store = Store(name=f"Test Store for {role}", address=f"123 {role} Street")
#         db.session.add(store)
#         db.session.flush() # Flush to get the store ID immediately

#         user = User(
#             name=f"test_{role}_user",
#             email=f"test_{role}_user@example.com",
#             password="test_password", # In real app, this would be hashed
#             role=role,
#             store_id=store.id # Link user to the store
#         )
#         db.session.add(user)
#         db.session.flush() # Flush to get the user ID and ensure relationship is set

#         # Do NOT commit here. The test function or the session fixture will handle the commit/rollback.
#         # db.session.commit()

#         return {
#             'store_id': store.id,
#             'user_id': user.id
#         }

# def get_auth_headers(app, user_id, store_id):
#     """
#     Generates JWT headers for a given user_id and store_id.
#     Ensures the user object is re-fetched from the current session.
#     """
#     with app.app_context():
#         user = db.session.get(User, user_id)
#         if user is None:
#             raise ValueError(f"User with ID {user_id} not found in current session.")
#         # Optional: Verify user's store_id matches the requested store_id for token context
#         if user.store_id != store_id:
#             print(f"Warning: User {user_id} (store {user.store_id}) generating token for store {store_id}")

#         access_token = create_access_token(identity=user.id)
#     return {'Authorization': f'Bearer {access_token}'}

# def create_product_data(app, store_id):
#     """
#     Creates a category, product, and StoreProduct entry linked to the given store.
#     This data is added to the session and flushed to get IDs, but NOT committed.
#     The session fixture's rollback will clean it up.
#     Returns product_id and store_product_id.
#     """
#     with app.app_context():
#         category = Category(name="Test Category for Store Tests")
#         db.session.add(category)
#         db.session.flush()

#         product = Product(name="Test Product for Store", sku="TSP001", category_id=category.id, unit="pcs")
#         db.session.add(product)
#         db.session.flush()
#         product_id = product.id

#         store_product = StoreProduct(
#             store_id=store_id, product_id=product_id, quantity_in_stock=100, price=Decimal("10.00")
#         )
#         db.session.add(store_product)
#         # Do NOT commit here. The test function or the session fixture will handle the commit/rollback.
#         # db.session.commit()

#         return {
#             'product_id': product_id,
#             'store_product_id': store_product.id
#         }

# # Helper function to create a sale with items, using store_product_id and price_at_sale
# def create_sale_with_items(app, user_id, store_id, items_data, sale_datetime=None):
#     """
#     Creates a sale and associated sale items.
#     Allows specifying sale_datetime to control 'created_at' for date-based reports.
#     This data is added to the session and flushed to get IDs, but NOT committed.
#     The session fixture's rollback will clean it up.
#     """
#     with app.app_context():
#         if sale_datetime is None:
#             sale_datetime = datetime.now(timezone.utc)

#         sale = Sale(
#             cashier_id=user_id,
#             store_id=store_id,
#             payment_status="paid",
#         )
#         sale.created_at = sale_datetime
#         db.session.add(sale)
#         db.session.flush() # Ensure sale ID is generated before creating sale items

#         for item_data in items_data:
#             price_for_sale = Decimal(str(item_data['price_at_sale']))
            
#             sale_item = SaleItem(
#                 sale_id=sale.id,
#                 store_product_id=item_data['store_product_id'],
#                 quantity=item_data['quantity'],
#                 price_at_sale=price_for_sale
#             )
#             db.session.add(sale_item)
#         # Do NOT commit here. The test function or the session fixture will handle the commit/rollback.
#         # db.session.commit()
#         return sale.id

# # Adjusted calculate_total_sales to handle Decimal for precision matching DB
# def calculate_total_sales(items_data):
#     """Calculates the total sales amount from a list of sale item data."""
#     total = sum(Decimal(str(item['quantity'])) * Decimal(str(item['price_at_sale'])) for item in items_data)
#     return float(f"{total:.2f}")


# # --- Test Cases for Store Routes ---

# # POST /api/store/
# def test_create_store_success(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     merchant_store_id = auth_data['store_id'] 
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()

#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=merchant_store_id)
    
#     data = {"name": "New Test Store", "address": "101 New Street"}
#     response = client.post("/api/store/", headers=headers, json=data) # `json=data` should set Content-Type

#     assert response.status_code == 201, f"Expected 201 but got {response.status_code}. Response: {response.json}"
#     assert "id" in response.json
#     assert response.json["name"] == "New Test Store"

#     with app.app_context():
#         new_store = db.session.get(Store, response.json["id"])
#         assert new_store is not None
#         assert new_store.name == "New Test Store"
#         assert new_store.address == "101 New Street"

# def test_create_store_missing_name(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     merchant_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=merchant_store_id)
    
#     data = {"address": "Missing Name Street"}
#     response = client.post("/api/store/", headers=headers, json=data)

#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Store name required"

# def test_create_store_unauthorized(client, app, session):
#     response = client.post("/api/store/", json={"name": "Unauthorized Store"})
#     assert response.status_code == 401, f"Expected 401 but got {response.status_code}. Response: {response.json}"

# def test_create_store_forbidden(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     clerk_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)
    
#     response = client.post("/api/store/", headers=headers, json={"name": "Forbidden Store"})
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # PATCH /api/store/<int:store_id>
# def test_update_store_success(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()

#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=store_id)
    
#     update_data = {"name": "Updated Test Store Name"}
#     response = client.patch(f"/api/store/{store_id}", headers=headers, json=update_data)

#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Store updated"

#     with app.app_context():
#         updated_store = db.session.get(Store, store_id)
#         assert updated_store.name == "Updated Test Store Name"
#         assert updated_store.address == "123 merchant Street"

# def test_update_store_not_found(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     merchant_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=merchant_store_id)
    
#     non_existent_id = merchant_store_id + 999
#     response = client.patch(f"/api/store/{non_existent_id}", headers=headers, json={"name": "Non Existent"})
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_update_store_forbidden(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     clerk_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)
    
#     response = client.patch(f"/api/store/{clerk_store_id}", headers=headers, json={"name": "Forbidden Update"})
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # DELETE /api/store/<int:store_id>
# def test_delete_store_success(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()

#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=store_id)
    
#     response = client.delete(f"/api/store/{store_id}", headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Store soft-deleted"

#     with app.app_context():
#         deleted_store = db.session.get(Store, store_id)
#         assert deleted_store.is_deleted is True

# def test_delete_store_not_found(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     merchant_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=merchant_store_id)
    
#     non_existent_id = merchant_store_id + 999
#     response = client.delete(f"/api/store/{non_existent_id}", headers=headers)
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_delete_store_forbidden(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     clerk_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)
    
#     response = client.delete(f"/api/store/{clerk_store_id}", headers=headers)
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # GET /api/store/
# def test_list_stores_success(client, app, session):
#     # Create multiple stores for testing list functionality
#     auth_data_merchant = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data_merchant['user_id']
#     merchant_store_id = auth_data_merchant['store_id'] 
    
#     # Commit the merchant's store and user for listing purposes
#     with app.app_context():
#         db.session.commit() 

#     # Create a second store via the API (as merchant)
#     headers_merchant = get_auth_headers(app, user_id=merchant_user_id, store_id=merchant_store_id)
#     client.post("/api/store/", headers=headers_merchant, json={"name": "Second Store", "address": "202 Second St"})
    
#     # Create a third store and soft delete it
#     response_create_third = client.post("/api/store/", headers=headers_merchant, json={"name": "Third Store", "address": "303 Third St"})
#     third_store_id = response_create_third.json['id']
#     client.delete(f"/api/store/{third_store_id}", headers=headers_merchant)

#     # List stores as an admin
#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     admin_store_id = auth_data_admin['store_id'] 
#     # Commit the admin's store and user for listing purposes
#     with app.app_context():
#         db.session.commit() 

#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=admin_store_id)

#     response = client.get("/api/store/", headers=headers_admin)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     stores = response.json
#     assert isinstance(stores, list)
#     assert len(stores) == 3 # Initial merchant store + second store + admin's store (all active)

#     store_names = {s['name'] for s in stores}
#     assert "Test Store for merchant" in store_names
#     assert "Second Store" in store_names
#     assert "Test Store for admin" in store_names
#     assert "Third Store" not in store_names

# def test_list_stores_unauthorized(client, app, session):
#     response = client.get("/api/store/")
#     assert response.status_code == 401, f"Expected 401 but got {response.status_code}. Response: {response.json}"

# def test_list_stores_forbidden(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     clerk_store_id = auth_data['store_id']
#     with app.app_context(): # Commit the user and store created by helper
#         db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)
    
#     response = client.get("/api/store/", headers=headers)
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # POST /api/store/<int:store_id>/invite
# def test_invite_user_success(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     # Commit the merchant's store and user to make them persistent for the invite test
#     with app.app_context():
#         db.session.commit()

#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=store_id)

#     invite_data = {"email": "invited@example.com", "role": "clerk"}
#     response = client.post(f"/api/store/{store_id}/invite", headers=headers, json=invite_data)

#     assert response.status_code == 202, f"Expected 202 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Invitation sent to invited@example.com"

#     with app.app_context():
#         new_user = db.session.query(User).filter_by(email="invited@example.com").first()
#         assert new_user is not None
#         assert new_user.email == "invited@example.com"
#         assert new_user.role == "clerk"
#         assert new_user.store_id == store_id
#         assert new_user.is_active is False

# def test_invite_user_missing_fields(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit() # Commit for the test
#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=store_id)

#     response = client.post(f"/api/store/{store_id}/invite", headers=headers, json={"email": "incomplete@example.com"})
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Email and role are required"

# def test_invite_user_invalid_role(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit() # Commit for the test
#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=store_id)

#     response = client.post(f"/api/store/{store_id}/invite", headers=headers, json={"email": "invalid@example.com", "role": "manager"})
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Invalid role"

# def test_invite_user_store_not_found(client, app, session):
#     auth_data = create_test_auth_data(app, role="merchant")
#     merchant_user_id = auth_data['user_id']
#     merchant_store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit() # Commit for the test
#     headers = get_auth_headers(app, user_id=merchant_user_id, store_id=merchant_store_id)

#     non_existent_id = merchant_store_id + 999
#     response = client.post(f"/api/store/{non_existent_id}/invite", headers=headers, json={"email": "test@example.com", "role": "clerk"})
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_invite_user_forbidden(client, app, session):
#     auth_data = create_test_auth_data(app, role="cashier")
#     cashier_user_id = auth_data['user_id']
#     cashier_store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit() # Commit for the test
#     headers = get_auth_headers(app, user_id=cashier_user_id, store_id=cashier_store_id)

#     response = client.post(f"/api/store/{cashier_store_id}/invite", headers=headers, json={"email": "forbidden@example.com", "role": "clerk"})
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # POST /api/store/<int:store_id>/supply-requests
# def test_create_supply_request_success(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     # Commit the clerk's store and user
#     with app.app_context():
#         db.session.commit()
    
#     product_data = create_product_data(app, store_id)
#     product_id = product_data['product_id']
#     # Commit the product data
#     with app.app_context():
#         db.session.commit()

#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=store_id)

#     request_data = {"product_id": product_id, "requested_quantity": 25}
#     response = client.post(f"/api/store/{store_id}/supply-requests", headers=headers, json=request_data)

#     assert response.status_code == 201, f"Expected 201 but got {response.status_code}. Response: {response.json}"
#     assert "id" in response.json
#     assert response.json["status"] == "pending"

#     with app.app_context():
#         new_request = db.session.get(SupplyRequest, response.json["id"])
#         assert new_request is not None
#         assert new_request.store_id == store_id
#         assert new_request.product_id == product_id
#         assert new_request.clerk_id == clerk_user_id
#         assert new_request.requested_quantity == 25
#         assert new_request.status == SupplyRequestStatus.pending

# def test_create_supply_request_missing_fields(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=store_id)

#     response = client.post(f"/api/store/{store_id}/supply-requests", headers=headers, json={"product_id": 1})
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert "message" in response.json and "required" in response.json["message"] # More generic assertion

# def test_create_supply_request_invalid_product(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=store_id)

#     non_existent_product_id = 9999
#     response = client.post(f"/api/store/{store_id}/supply-requests", headers=headers, json={"product_id": non_existent_product_id, "requested_quantity": 10})
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_create_supply_request_store_not_found(client, app, session):
#     auth_data = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data['user_id']
#     clerk_store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit()
#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)

#     product_data = create_product_data(app, clerk_store_id)
#     with app.app_context(): db.session.commit()
#     product_id = product_data['product_id']

#     non_existent_store_id = clerk_store_id + 999
#     response = client.post(f"/api/store/{non_existent_store_id}/supply-requests", headers=headers, json={"product_id": product_id, "requested_quantity": 10})
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_create_supply_request_forbidden(client, app, session):
#     auth_data = create_test_auth_data(app, role="cashier")
#     cashier_user_id = auth_data['user_id']
#     cashier_store_id = auth_data['store_id']
#     with app.app_context(): db.session.commit()
#     headers = get_auth_headers(app, user_id=cashier_user_id, store_id=cashier_store_id)

#     product_data = create_product_data(app, cashier_store_id)
#     with app.app_context(): db.session.commit()
#     product_id = product_data['product_id']

#     response = client.post(f"/api/store/{cashier_store_id}/supply-requests", headers=headers, json={"product_id": product_id, "requested_quantity": 10})
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # PATCH /api/store/<int:store_id>/supply-requests/<int:req_id>/respond
# def test_respond_supply_request_approve_success(client, app, session):
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     product_data = create_product_data(app, store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         supply_req = SupplyRequest(
#             store_id=store_id,
#             product_id=product_id,
#             clerk_id=clerk_user_id,
#             requested_quantity=10,
#             status=SupplyRequestStatus.pending
#         )
#         db.session.add(supply_req)
#         db.session.commit() # Commit the supply request so it's queryable

#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     admin_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit() # Commit admin user/store

#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=admin_store_id)

#     response = client.patch(
#         f"/api/store/{store_id}/supply-requests/{supply_req.id}/respond",
#         headers=headers_admin,
#         json={"action": "approve", "comment": "Approved by admin"}
#     )
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json["status"] == "approved"

#     with app.app_context():
#         updated_req = db.session.get(SupplyRequest, supply_req.id)
#         assert updated_req.status == SupplyRequestStatus.approved
#         assert updated_req.admin_id == admin_user_id
#         assert updated_req.admin_response == "Approved by admin"
#         assert updated_req.updated_at is not None

# def test_respond_supply_request_decline_success(client, app, session):
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     product_data = create_product_data(app, store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         supply_req = SupplyRequest(
#             store_id=store_id,
#             product_id=product_id,
#             clerk_id=clerk_user_id,
#             requested_quantity=10,
#             status=SupplyRequestStatus.pending
#         )
#         db.session.add(supply_req)
#         db.session.commit()
        
#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     admin_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()

#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=admin_store_id)

#     response = client.patch(
#         f"/api/store/{store_id}/supply-requests/{supply_req.id}/respond",
#         headers=headers_admin,
#         json={"action": "decline", "comment": "Not enough stock"}
#     )
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json["status"] == "declined"

#     with app.app_context():
#         updated_req = db.session.get(SupplyRequest, supply_req.id)
#         assert updated_req.status == SupplyRequestStatus.declined
#         assert updated_req.admin_id == admin_user_id
#         assert updated_req.admin_response == "Not enough stock"
#         assert updated_req.updated_at is not None

# def test_respond_supply_request_invalid_action(client, app, session):
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     product_data = create_product_data(app, store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         supply_req = SupplyRequest(
#             store_id=store_id, product_id=product_id, clerk_id=clerk_user_id, requested_quantity=10, status=SupplyRequestStatus.pending
#         )
#         db.session.add(supply_req)
#         db.session.commit()

#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     admin_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()

#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=admin_store_id)

#     response = client.patch(
#         f"/api/store/{store_id}/supply-requests/{supply_req.id}/respond",
#         headers=headers_admin,
#         json={"action": "invalid_action"}
#     )
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Invalid action"

# def test_respond_supply_request_already_processed(client, app, session):
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     product_data = create_product_data(app, store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         supply_req = SupplyRequest(
#             store_id=store_id, product_id=product_id, clerk_id=clerk_user_id, requested_quantity=10, status=SupplyRequestStatus.approved # Already approved
#         )
#         db.session.add(supply_req)
#         db.session.commit()

#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     admin_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()

#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=admin_store_id)

#     response = client.patch(
#         f"/api/store/{store_id}/supply-requests/{supply_req.id}/respond",
#         headers=headers_admin,
#         json={"action": "decline"}
#     )
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     # Assuming your API returns this specific message. Adjust if your API message differs.
#     assert response.json["message"] == "Transfer already processed" 

# def test_respond_supply_request_not_found(client, app, session):
#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()
#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=store_id)

#     non_existent_req_id = 9999
#     response = client.patch(
#         f"/api/store/{store_id}/supply-requests/{non_existent_req_id}/respond",
#         headers=headers_admin,
#         json={"action": "approve"}
#     )
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_respond_supply_request_forbidden(client, app, session):
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     product_data = create_product_data(app, store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         supply_req = SupplyRequest(
#             store_id=store_id, product_id=product_id, clerk_id=clerk_user_id, requested_quantity=10, status=SupplyRequestStatus.pending
#         )
#         db.session.add(supply_req)
#         db.session.commit()

#     headers_clerk = get_auth_headers(app, user_id=clerk_user_id, store_id=store_id)

#     response = client.patch(
#         f"/api/store/{store_id}/supply-requests/{supply_req.id}/respond",
#         headers=headers_clerk,
#         json={"action": "approve"}
#     )
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # POST /api/store/stock-transfers
# def test_initiate_transfer_success(client, app, session):
#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     from_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         to_store = Store(name="Destination Store", address="789 Destination Ave")
#         db.session.add(to_store)
#         db.session.commit() # Commit this store separately
#         to_store_id = to_store.id
    
#     product_data = create_product_data(app, from_store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     headers = get_auth_headers(app, user_id=admin_user_id, store_id=from_store_id)

#     transfer_data = {
#         "from_store_id": from_store_id,
#         "to_store_id": to_store_id,
#         "notes": "Test transfer",
#         "items": [
#             {"product_id": product_id, "quantity": 5},
#         ]
#     }
#     response = client.post("/api/store/stock-transfers", headers=headers, json=transfer_data)

#     assert response.status_code == 201, f"Expected 201 but got {response.status_code}. Response: {response.json}"
#     assert "id" in response.json
#     assert response.json["status"] == "pending"

#     with app.app_context():
#         new_transfer = db.session.get(StockTransfer, response.json["id"])
#         assert new_transfer is not None
#         assert new_transfer.from_store_id == from_store_id
#         assert new_transfer.to_store_id == to_store_id
#         assert new_transfer.initiated_by == admin_user_id
#         assert new_transfer.status == StockTransferStatus.pending
#         assert len(new_transfer.items) == 1
#         assert new_transfer.items[0].product_id == product_id
#         assert new_transfer.items[0].quantity == 5

# def test_initiate_transfer_missing_fields(client, app, session):
#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     from_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         to_store = Store(name="Another Store", address="Another Ave")
#         db.session.add(to_store)
#         db.session.commit()
#         to_store_id = to_store.id

#     headers = get_auth_headers(app, user_id=admin_user_id, store_id=from_store_id)

#     response = client.post("/api/store/stock-transfers", headers=headers, json={"from_store_id": from_store_id, "to_store_id": to_store_id})
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert "message" in response.json and "items" in response.json["message"] # Assuming a validation message for missing 'items'

# def test_initiate_transfer_forbidden(client, app, session):
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     clerk_store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     headers = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)

#     response = client.post("/api/store/stock-transfers", headers=headers, json={"from_store_id": 1, "to_store_id": 2, "items": []})
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

# # PATCH /api/store/stock-transfers/<int:transfer_id>/approve
# def test_approve_transfer_success(client, app, session):
#     auth_data_admin_initiator = create_test_auth_data(app, role="admin")
#     initiator_user_id = auth_data_admin_initiator['user_id']
#     from_store_id = auth_data_admin_initiator['store_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         to_store = Store(name="Destination Store for Transfer", address="789 Transfer Ave")
#         db.session.add(to_store)
#         db.session.commit()
#         to_store_id = to_store.id
    
#     product_data = create_product_data(app, from_store_id)
#     product_id = product_data['product_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         transfer = StockTransfer(
#             from_store_id=from_store_id,
#             to_store_id=to_store_id,
#             initiated_by=initiator_user_id,
#             notes="Transfer to approve",
#             status=StockTransferStatus.pending
#         )
#         db.session.add(transfer)
#         db.session.flush() # Flush to get transfer ID
        
#         sti = StockTransferItem(
#             stock_transfer_id=transfer.id,
#             product_id=product_id,
#             quantity=5
#         )
#         db.session.add(sti)
#         db.session.commit() # Commit the transfer and its items

#     auth_data_admin_approver = create_test_auth_data(app, role="admin")
#     approver_user_id = auth_data_admin_approver['user_id']
#     approver_store_id = auth_data_admin_approver['store_id']
#     with app.app_context(): db.session.commit() # Commit approver user/store

#     headers_approver = get_auth_headers(app, user_id=approver_user_id, store_id=approver_store_id)

#     response = client.patch(f"/api/store/stock-transfers/{transfer.id}/approve", headers=headers_approver)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json["status"] == "approved"

#     with app.app_context():
#         updated_transfer = db.session.get(StockTransfer, transfer.id)
#         assert updated_transfer.status == StockTransferStatus.approved
#         assert updated_transfer.approved_by == approver_user_id
#         assert updated_transfer.transfer_date is not None

# def test_approve_transfer_not_found(client, app, session):
#     auth_data_admin = create_test_auth_data(app, role="admin")
#     admin_user_id = auth_data_admin['user_id']
#     admin_store_id = auth_data_admin['store_id']
#     with app.app_context(): db.session.commit()
#     headers_admin = get_auth_headers(app, user_id=admin_user_id, store_id=admin_store_id)

#     non_existent_transfer_id = 9999
#     response = client.patch(f"/api/store/stock-transfers/{non_existent_transfer_id}/approve", headers=headers_admin)
#     assert response.status_code == 404, f"Expected 404 but got {response.status_code}. Response: {response.json}"

# def test_approve_transfer_already_processed(client, app, session):
#     auth_data_admin_initiator = create_test_auth_data(app, role="admin")
#     initiator_user_id = auth_data_admin_initiator['user_id']
#     from_store_id = auth_data_admin_initiator['store_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         to_store = Store(name="Another Destination Store", address="101 Another Ave")
#         db.session.add(to_store)
#         db.session.commit()
#         to_store_id = to_store.id

#         transfer = StockTransfer(
#             from_store_id=from_store_id,
#             to_store_id=to_store_id,
#             initiated_by=initiator_user_id,
#             notes="Already approved transfer",
#             status=StockTransferStatus.approved # Already approved
#         )
#         db.session.add(transfer)
#         db.session.commit()
        
#     auth_data_admin_approver = create_test_auth_data(app, role="admin")
#     approver_user_id = auth_data_admin_approver['user_id']
#     approver_store_id = auth_data_admin_approver['store_id']
#     with app.app_context(): db.session.commit()

#     headers_approver = get_auth_headers(app, user_id=approver_user_id, store_id=approver_store_id)

#     response = client.patch(f"/api/store/stock-transfers/{transfer.id}/approve", headers=headers_approver)
#     assert response.status_code == 400, f"Expected 400 but got {response.status_code}. Response: {response.json}"
#     assert response.json["message"] == "Transfer already processed"

# def test_approve_transfer_forbidden(client, app, session):
#     auth_data_admin_initiator = create_test_auth_data(app, role="admin")
#     initiator_user_id = auth_data_admin_initiator['user_id']
#     from_store_id = auth_data_admin_initiator['store_id']
#     with app.app_context(): db.session.commit()

#     with app.app_context():
#         to_store = Store(name="Forbidden Destination Store", address="202 Forbidden Ave")
#         db.session.add(to_store)
#         db.session.commit()
#         to_store_id = to_store.id

#         transfer = StockTransfer(
#             from_store_id=from_store_id,
#             to_store_id=to_store_id,
#             initiated_by=initiator_user_id,
#             notes="Forbidden approval attempt",
#             status=StockTransferStatus.pending
#         )
#         db.session.add(transfer)
#         db.session.commit()
        
#     auth_data_clerk = create_test_auth_data(app, role="clerk")
#     clerk_user_id = auth_data_clerk['user_id']
#     clerk_store_id = auth_data_clerk['store_id']
#     with app.app_context(): db.session.commit()

#     headers_clerk = get_auth_headers(app, user_id=clerk_user_id, store_id=clerk_store_id)

#     response = client.patch(f"/api/store/stock-transfers/{transfer.id}/approve", headers=headers_clerk)
#     assert response.status_code == 403, f"Expected 403 but got {response.status_code}. Response: {response.json}"

