# import pytest
# from datetime import datetime, timedelta, timezone
# from app.models import db, User, Store, Category, Product, Sale, SaleItem, StoreProduct # Ensure all models are imported
# from flask_jwt_extended import create_access_token
# import json
# from decimal import Decimal

# # Helper function to get a JWT token for a test user
# def get_auth_headers(app, user_id, store_id):
#     """
#     Generates JWT headers for a given user_id and store_id.
#     Ensures the user and store are re-fetched from the current session.
#     """
#     with app.app_context():
#         # It's crucial to re-fetch the user object within the *current* session context
#         # to ensure it's properly loaded and available for JWT creation.
#         user = db.session.get(User, user_id)
        
#         # Also, verify the user's store_id if that's part of your authentication logic
#         # or a constraint for the token.
#         if user is None:
#             raise ValueError(f"User with ID {user_id} not found in current session.")
        
#         # If your JWT token's identity is just the user ID and store_id is only for route,
#         # then the store association check isn't strictly needed here for token creation.
#         # However, it's good for ensuring test data consistency.
#         if user.store_id != store_id:
#             raise ValueError(f"User {user_id} is associated with store {user.store_id}, not requested store {store_id}.")
            
#         access_token = create_access_token(identity=user.id)
#     return {'Authorization': f'Bearer {access_token}'}

# # MODIFIED: Helper function to create additional test data (products, store_products)
# # It now expects existing store_id and user_id from the conftest
# def create_reporting_specific_test_data(app, store_id, user_id):
#     """
#     Creates categories, products, and StoreProduct entries for reporting tests,
#     linking them to the existing store_id and user_id from conftest.
#     """
#     with app.app_context():
#         # Create Category
#         category = Category(name="Test Category Reports")
#         db.session.add(category)
#         db.session.flush() # Flush to assign an ID to 'category'

#         # Create Products
#         product_A = Product(name="Product A Report", sku="PAR001", category_id=category.id, unit="pcs")
#         product_B = Product(name="Product B Report", sku="PBR002", category_id=category.id, unit="pcs")
#         product_C = Product(name="Product C Report", sku="PCR003", category_id=category.id, unit="pcs")
#         db.session.add_all([product_A, product_B, product_C])
#         db.session.flush() # Flush to assign IDs to products
        
#         product_A_id = product_A.id # Capture IDs
#         product_B_id = product_B.id
#         product_C_id = product_C.id

#         # Create StoreProducts
#         store_product_A = StoreProduct(
#             store_id=store_id, product_id=product_A_id, quantity_in_stock=100, price=Decimal("150.00")
#         )
#         store_product_B = StoreProduct(
#             store_id=store_id, product_id=product_B_id, quantity_in_stock=100, price=Decimal("250.00")
#         )
#         store_product_C = StoreProduct(
#             store_id=store_id, product_id=product_C_id, quantity_in_stock=100, price=Decimal("50.00")
#         )
#         db.session.add_all([store_product_A, store_product_B, store_product_C])
#         db.session.flush() # Flush to assign IDs to store products
        
#         store_product_A_id = store_product_A.id # Capture IDs
#         store_product_B_id = store_product_B.id
#         store_product_C_id = store_product_C.id
        
#         db.session.commit() # Commit all changes at the very end

#     return {
#         'product_A_id': product_A_id,
#         'product_B_id': product_B_id,
#         'product_C_id': product_C_id,
#         'store_product_A_id': store_product_A_id,
#         'store_product_B_id': store_product_B_id,
#         'store_product_C_id': store_product_C_id,
#     }

# # Helper function to create a sale with items, using store_product_id and price_at_sale
# def create_sale_with_items(app, user_id, store_id, items_data, sale_datetime=None):
#     """
#     Creates a sale and associated sale items.
#     Allows specifying sale_datetime to control 'created_at' for date-based reports.
#     """
#     with app.app_context():
#         if sale_datetime is None:
#             # Use timezone.utc for utcnow replacement as per DeprecationWarning
#             sale_datetime = datetime.now(timezone.utc)

#         sale = Sale(
#             cashier_id=user_id,
#             store_id=store_id,
#             payment_status="paid",
#         )
#         sale.created_at = sale_datetime
#         db.session.add(sale)
#         db.session.flush()

#         for item_data in items_data:
#             price_for_sale = Decimal(str(item_data['price_at_sale']))
            
#             sale_item = SaleItem(
#                 sale_id=sale.id,
#                 store_product_id=item_data['store_product_id'],
#                 quantity=item_data['quantity'],
#                 price_at_sale=price_for_sale
#             )
#             db.session.add(sale_item)
#         db.session.commit()
#         return sale.id

# # Adjusted calculate_total_sales to handle Decimal for precision matching DB
# def calculate_total_sales(items_data):
#     """Calculates the total sales amount from a list of sale item data."""
#     total = sum(Decimal(str(item['quantity'])) * Decimal(str(item['price_at_sale'])) for item in items_data)
#     return float(f"{total:.2f}")


# # --- Test Cases for Reporting Routes ---

# def test_daily_summary(client, app, session): # Add 'session' fixture
#     # Use base IDs from app.config which are set by conftest.session fixture
#     store_id = app.config['BASE_STORE_ID']
#     user_id = app.config['BASE_USER_ID']
    
#     # Create reporting-specific product data linked to the base store/user
#     reporting_data = create_reporting_specific_test_data(app, store_id, user_id)
#     store_product_A_id = reporting_data['store_product_A_id']

#     headers = get_auth_headers(app, user_id=user_id, store_id=store_id) 

#     with app.app_context():
#         # Clear only sales/sale items for this test, base data (store, user) persists from conftest.
#         # Ensure we're using the session from the fixture for these operations.
#         # Note: If sales were not linked to the store_id, you might need to adjust the filter.
#         session.query(SaleItem).filter(SaleItem.sale.has(store_id=store_id)).delete(synchronize_session=False)
#         session.query(Sale).filter_by(store_id=store_id).delete(synchronize_session=False)
#         session.commit() # Commit the deletion

#     today = datetime.now(timezone.utc)
#     items_today = [{'store_product_id': store_product_A_id, 'quantity': 5, 'price_at_sale': 10.00}] 
#     create_sale_with_items(app, user_id, store_id, items_today, today)
    
#     response = client.get(f'/reports/daily/{store_id}', headers=headers)
    
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     daily_report = response.json
#     assert daily_report is not None
#     assert 'date' in daily_report
#     assert 'total_sales' in daily_report
#     assert 'total_items_sold' in daily_report
#     assert daily_report['date'] == today.strftime('%Y-%m-%d') 
#     assert abs(daily_report['total_sales'] - calculate_total_sales(items_today)) < 0.01
#     assert daily_report['total_items_sold'] == sum(item['quantity'] for item in items_today)

#     with app.app_context():
#         session.query(SaleItem).filter(SaleItem.sale.has(store_id=store_id)).delete(synchronize_session=False)
#         session.query(Sale).filter_by(store_id=store_id).delete(synchronize_session=False)
#         session.commit() # Commit the deletion
    
#     yesterday = datetime.now(timezone.utc) - timedelta(days=1)
#     create_sale_with_items(app, user_id, store_id, items_today, yesterday)

#     response = client.get(f'/reports/daily/{store_id}', headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     daily_report_no_sales = response.json
#     assert daily_report_no_sales is not None
#     assert 'total_sales' in daily_report_no_sales
#     assert 'total_items_sold' in daily_report_no_sales
#     assert daily_report_no_sales['date'] == datetime.now(timezone.utc).strftime('%Y-%m-%d')
#     assert daily_report_no_sales['total_sales'] == 0.0
#     assert daily_report_no_sales['total_items_sold'] == 0

#     # Test without headers - should be 401
#     response = client.get(f'/reports/daily/{store_id}') 
#     assert response.status_code == 401

#     # Test with non-existent store_id
#     non_existent_store_id = app.config['BASE_STORE_ID'] + 999 
#     # Use headers for a valid user, but the store_id in the URL is non-existent
#     response = client.get(f'/reports/daily/{non_existent_store_id}', headers=headers)
#     # The API's current behavior returns 200 with 0 sales if the store_id doesn't exist.
#     # If your actual API logic should return 404 for non-existent stores, adjust this assertion.
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json['date'] == datetime.now(timezone.utc).strftime('%Y-%m-%d')
#     assert response.json['total_sales'] == 0.0
#     assert response.json['total_items_sold'] == 0


# def test_weekly_summary(client, app, session): # Add 'session' fixture
#     store_id = app.config['BASE_STORE_ID']
#     user_id = app.config['BASE_USER_ID']
    
#     reporting_data = create_reporting_specific_test_data(app, store_id, user_id)
#     store_product_A_id = reporting_data['store_product_A_id']
#     store_product_B_id = reporting_data['store_product_B_id']

#     headers = get_auth_headers(app, user_id=user_id, store_id=store_id)

#     with app.app_context():
#         session.query(SaleItem).filter(SaleItem.sale.has(store_id=store_id)).delete(synchronize_session=False)
#         session.query(Sale).filter_by(store_id=store_id).delete(synchronize_session=False)
#         session.commit()

#     today = datetime.now(timezone.utc)
#     current_week_sales_total = 0.0
#     current_week_items_total = 0

#     # Sales within the current week (as determined by the API)
#     # Place sales on Monday, Thursday, and Friday of the current week relative to 'today'
#     current_week_monday = today - timedelta(days=today.weekday())
#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 10, 'price_at_sale': 15.00}], current_week_monday)
#     current_week_sales_total += calculate_total_sales([{'quantity': 10, 'price_at_sale': 15.00}])
#     current_week_items_total += 10

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_B_id, 'quantity': 2, 'price_at_sale': 200.00}], current_week_monday + timedelta(days=3))
#     current_week_sales_total += calculate_total_sales([{'quantity': 2, 'price_at_sale': 200.00}])
#     current_week_items_total += 2

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 3, 'price_at_sale': 50.00}], today)
#     current_week_sales_total += calculate_total_sales([{'quantity': 3, 'price_at_sale': 50.00}])
#     current_week_items_total += 3

#     # Sale outside the current week (previous week)
#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 1, 'price_at_sale': 100.00}], today - timedelta(days=7 + today.weekday()))

#     response = client.get(f'/reports/weekly/{store_id}', headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     weekly_report = response.json
#     assert weekly_report is not None
#     assert 'total_sales' in weekly_report
#     assert 'total_items_sold' in weekly_report
#     assert abs(weekly_report['total_sales'] - current_week_sales_total) < 0.01
#     assert weekly_report['total_items_sold'] == current_week_items_total
#     # You might also want to assert 'start_date' and 'end_date' if your API provides them and you can calculate them consistently in the test.

#     response = client.get(f'/reports/weekly/{store_id}')
#     assert response.status_code == 401

# def test_monthly_summary(client, app, session): # Add 'session' fixture
#     store_id = app.config['BASE_STORE_ID']
#     user_id = app.config['BASE_USER_ID']
    
#     reporting_data = create_reporting_specific_test_data(app, store_id, user_id)
#     store_product_A_id = reporting_data['store_product_A_id']
#     store_product_B_id = reporting_data['store_product_B_id']

#     headers = get_auth_headers(app, user_id=user_id, store_id=store_id)

#     with app.app_context():
#         session.query(SaleItem).filter(SaleItem.sale.has(store_id=store_id)).delete(synchronize_session=False)
#         session.query(Sale).filter_by(store_id=store_id).delete(synchronize_session=False)
#         session.commit()

#     today = datetime.now(timezone.utc)
#     current_month_sales_total = 0.0
#     current_month_items_total = 0

#     first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 20, 'price_at_sale': 5.00}], first_day_of_month)
#     current_month_sales_total += calculate_total_sales([{'quantity': 20, 'price_at_sale': 5.00}])
#     current_month_items_total += 20

#     mid_month_day = min(15, today.day)
#     mid_month_date = today.replace(day=mid_month_day, hour=0, minute=0, second=0, microsecond=0)
#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_B_id, 'quantity': 5, 'price_at_sale': 300.00}], mid_month_date) 
#     current_month_sales_total += calculate_total_sales([{'quantity': 5, 'price_at_sale': 300.00}])
#     current_month_items_total += 5

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 2, 'price_at_sale': 75.00}], today)
#     current_month_sales_total += calculate_total_sales([{'quantity': 2, 'price_at_sale': 75.00}])
#     current_month_items_total += 2

#     # Sale from a previous month (outside current month)
#     if today.month == 1:
#         last_month_date = today.replace(year=today.year - 1, month=12, day=15)
#     else:
#         last_month_date = today.replace(month=today.month - 1, day=15)
    
#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 1, 'price_at_sale': 100.00}], last_month_date)

#     response = client.get(f'/reports/monthly/{store_id}', headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     monthly_report = response.json
#     assert monthly_report is not None
#     assert 'total_sales' in monthly_report
#     assert 'total_items_sold' in monthly_report
#     assert abs(monthly_report['total_sales'] - current_month_sales_total) < 0.01
#     assert monthly_report['total_items_sold'] == current_month_items_total

#     response = client.get(f'/reports/monthly/{store_id}')
#     assert response.status_code == 401

# def test_top_products(client, app, session): # Add 'session' fixture
#     store_id = app.config['BASE_STORE_ID']
#     user_id = app.config['BASE_USER_ID']
    
#     reporting_data = create_reporting_specific_test_data(app, store_id, user_id)
#     product_A_id = reporting_data['product_A_id']
#     product_B_id = reporting_data['product_B_id']
#     product_C_id = reporting_data['product_C_id']
#     store_product_A_id = reporting_data['store_product_A_id']
#     store_product_B_id = reporting_data['store_product_B_id']
#     store_product_C_id = reporting_data['store_product_C_id']

#     headers = get_auth_headers(app, user_id=user_id, store_id=store_id)

#     with app.app_context():
#         session.query(SaleItem).filter(SaleItem.sale.has(store_id=store_id)).delete(synchronize_session=False)
#         session.query(Sale).filter_by(store_id=store_id).delete(synchronize_session=False)
#         session.commit()

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 10, 'price_at_sale': 15.00}])
#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_A_id, 'quantity': 5, 'price_at_sale': 20.00}])

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_B_id, 'quantity': 8, 'price_at_sale': 25.00}])

#     create_sale_with_items(app, user_id, store_id, [{'store_product_id': store_product_C_id, 'quantity': 3, 'price_at_sale': 30.00}])

#     response = client.get(f'/reports/top-products/{store_id}', headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     top_products_list = response.json
#     assert isinstance(top_products_list, list)
#     assert len(top_products_list) >= 3
    
#     product_a_report = next((p for p in top_products_list if p['product_id'] == product_A_id), None)
#     assert product_a_report is not None
#     assert product_a_report['total_quantity_sold'] == 15
#     assert abs(product_a_report['total_sales_amount'] - 250.00) < 0.01

#     product_b_report = next((p for p in top_products_list if p['product_id'] == product_B_id), None)
#     assert product_b_report is not None
#     assert product_b_report['total_quantity_sold'] == 8
#     assert abs(product_b_report['total_sales_amount'] - 200.00) < 0.01

#     product_c_report = next((p for p in top_products_list if p['product_id'] == product_C_id), None)
#     assert product_c_report is not None
#     assert product_c_report['total_quantity_sold'] == 3
#     assert abs(product_c_report['total_sales_amount'] - 90.00) < 0.01

#     total_sales_A = (10 * 15.00) + (5 * 20.00)
#     total_sales_B = (8 * 25.00)
#     total_sales_C = (3 * 30.00)

#     expected_order = sorted(
#         [
#             {'product_id': product_A_id, 'total_sales_amount': total_sales_A, 'total_quantity_sold': 15},
#             {'product_id': product_B_id, 'total_sales_amount': total_sales_B, 'total_quantity_sold': 8},
#             {'product_id': product_C_id, 'total_sales_amount': total_sales_C, 'total_quantity_sold': 3}
#         ],
#         key=lambda x: x['total_sales_amount'], reverse=True
#     )
    
#     for i, expected_prod in enumerate(expected_order):
#         if i < len(top_products_list):
#             assert top_products_list[i]['product_id'] == expected_prod['product_id']
#             assert abs(top_products_list[i]['total_sales_amount'] - expected_prod['total_sales_amount']) < 0.01
#             assert top_products_list[i]['total_quantity_sold'] == expected_prod['total_quantity_sold']


#     response = client.get(f'/reports/top-products/{store_id}?limit=2', headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     top_products_limited = response.json
#     assert isinstance(top_products_limited, list)
#     assert len(top_products_limited) == 2
#     assert top_products_limited[0]['product_id'] == expected_order[0]['product_id']
#     assert top_products_limited[1]['product_id'] == expected_order[1]['product_id']

#     with app.app_context():
#         session.query(SaleItem).filter(SaleItem.sale.has(store_id=store_id)).delete(synchronize_session=False)
#         session.query(Sale).filter_by(store_id=store_id).delete(synchronize_session=False)
#         session.commit()
    
#     response = client.get(f'/reports/top-products/{store_id}', headers=headers)
#     assert response.status_code == 200, f"Expected 200 but got {response.status_code}. Response: {response.json}"
#     assert response.json == []

#     response = client.get(f'/reports/top-products/{store_id}')
#     assert response.status_code == 401