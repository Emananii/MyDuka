import pytest
import datetime
import json

# Base URL for inventory routes
INVENTORY_BASE_URL = '/api/inventory'

# --- HELPER FUNCTIONS (using client for API interaction) ---

def create_category_via_api(client, name, description=None):
    """Helper to create a category via the API."""
    data = {"name": name}
    if description:
        data["description"] = description
    response = client.post(f'{INVENTORY_BASE_URL}/categories', json=data)
    assert response.status_code == 201
    return response.json

def create_product_via_api(client, name, category_id, unit, description=None, sku=None):
    """Helper to create a product via the API."""
    data = {
        "name": name,
        "category_id": category_id,
        "unit": unit
    }
    if description:
        data["description"] = description
    if sku:
        data["sku"] = sku
    response = client.post(f'{INVENTORY_BASE_URL}/products', json=data)
    assert response.status_code == 201
    return response.json

def create_purchase_via_api(client, supplier_id, store_id, items, date=None, reference_number=None, is_paid=False, notes=None):
    """Helper to create a purchase via the API."""
    data = {
        "supplier_id": supplier_id,
        "store_id": store_id,
        "items": items
    }
    if date:
        data["date"] = date
    if reference_number:
        data["reference_number"] = reference_number
    data["is_paid"] = is_paid
    if notes:
        data["notes"] = notes
    response = client.post(f'{INVENTORY_BASE_URL}/purchases', json=data)
    assert response.status_code == 201 # Helper assumes successful creation
    return response.json

# --- CATEGORY TESTS (No changes needed here based on traceback) ---

def test_get_categories(client):
    """Test retrieving a list of categories."""
    cat1 = create_category_via_api(client, "Electronics")
    cat2 = create_category_via_api(client, "Books")
    deleted_cat = create_category_via_api(client, "Deleted Category")
    client.delete(f'{INVENTORY_BASE_URL}/categories/{deleted_cat["id"]}')

    response = client.get(f'{INVENTORY_BASE_URL}/categories')
    assert response.status_code == 200
    data = response.json
    assert len(data) >= 2
    category_names = {c['name'] for c in data}
    assert "Electronics" in category_names
    assert "Books" in category_names
    assert "Deleted Category" not in category_names

def test_create_category(client):
    """Test creating a new category."""
    category_data = {"name": "Test Create Category", "description": "A new category for testing creation"}
    response = client.post(f'{INVENTORY_BASE_URL}/categories', json=category_data)
    assert response.status_code == 201
    data = response.json
    assert data['name'] == "Test Create Category"
    assert data['description'] == "A new category for testing creation"
    assert data['id'] is not None
    assert not data['is_deleted']

def test_create_category_missing_name(client):
    """Test creating a category with missing name."""
    category_data = {"description": "Missing name"}
    response = client.post(f'{INVENTORY_BASE_URL}/categories', json=category_data)
    assert response.status_code == 400
    assert response.json == {"message": "Name is required."}

def test_update_category(client):
    """Test updating an existing category."""
    category = create_category_via_api(client, "Category to Update", "Original description")
    update_data = {"name": "Updated Category Name", "description": "Updated description"}
    response = client.patch(f'{INVENTORY_BASE_URL}/categories/{category["id"]}', json=update_data)
    assert response.status_code == 200
    data = response.json
    assert data['id'] == category['id']
    assert data['name'] == "Updated Category Name"
    assert data['description'] == "Updated description"

def test_update_category_not_found(client):
    """Test updating a non-existent category."""
    response = client.patch(f'{INVENTORY_BASE_URL}/categories/999999', json={"name": "Non Existent"})
    assert response.status_code == 404

def test_delete_category(client):
    """Test soft deleting a category."""
    category = create_category_via_api(client, "Category to Delete")
    response = client.delete(f'{INVENTORY_BASE_URL}/categories/{category["id"]}')
    assert response.status_code == 200
    assert response.json == {"message": "Category deleted"}
    get_response = client.get(f'{INVENTORY_BASE_URL}/categories')
    assert get_response.status_code == 200
    data = get_response.json
    deleted_category_present = any(c['id'] == category['id'] for c in data)
    assert not deleted_category_present

def test_delete_category_not_found(client):
    """Test deleting a non-existent category."""
    response = client.delete(f'{INVENTORY_BASE_URL}/categories/999999')
    assert response.status_code == 404

# --- PRODUCT TESTS (No changes needed here based on traceback, but retaining previous fix) ---

def test_get_products(client):
    """Test retrieving a list of products."""
    cat = create_category_via_api(client, "Product Category")
    prod1 = create_product_via_api(client, "Laptop", cat['id'], "pcs")
    prod2 = create_product_via_api(client, "Mouse", cat['id'], "pcs")
    deleted_prod = create_product_via_api(client, "Deleted Product", cat['id'], "pcs")
    client.delete(f'{INVENTORY_BASE_URL}/products/{deleted_prod["id"]}')

    response = client.get(f'{INVENTORY_BASE_URL}/products')
    assert response.status_code == 200
    data = response.json
    assert len(data) >= 2
    product_names = {p['name'] for p in data}
    assert "Laptop" in product_names
    assert "Mouse" in product_names
    assert "Deleted Product" not in product_names

def test_create_product(client):
    """Test creating a new product."""
    cat = create_category_via_api(client, "Product Create Category")
    product_data = {
        "name": "Test Create Product",
        "description": "A brand new item for creation test",
        "category_id": cat['id'],
        "unit": "unit",
        "sku": "TCP-001"
    }
    response = client.post(f'{INVENTORY_BASE_URL}/products', json=product_data)
    assert response.status_code == 201
    data = response.json
    assert data['name'] == "Test Create Product"
    assert data['category_id'] == cat['id']
    assert data['unit'] == "unit"
    assert data['sku'] == "TCP-001"
    assert not data['is_deleted']
    assert data['id'] is not None

def test_create_product_missing_fields(client):
    """Test creating a product with missing required fields."""
    cat = create_category_via_api(client, "Missing Fields Category")
    product_data = {
        "name": "Incomplete Product",
        "category_id": cat['id'],
    }
    response = client.post(f'{INVENTORY_BASE_URL}/products', json=product_data)
    assert response.status_code == 400
    assert response.json == {"message": "Name, category_id, and unit are required."}

def test_update_product(client):
    """Test updating an existing product."""
    cat = create_category_via_api(client, "Product Update Category")
    product = create_product_via_api(client, "Product to Update", cat['id'], "pcs", description="A product for testing update")
    update_data = {"name": "Updated Product Name", "unit": "kg", "description": "Updated product description"}
    response = client.patch(f'{INVENTORY_BASE_URL}/products/{product["id"]}', json=update_data)
    assert response.status_code == 200
    data = response.json
    assert data['id'] == product['id']
    assert data['name'] == "Updated Product Name"
    assert data['unit'] == "kg"
    assert data['description'] == "Updated product description"
    assert data['category_id'] == cat['id']

def test_update_product_not_found(client):
    """Test updating a non-existent product."""
    response = client.patch(f'{INVENTORY_BASE_URL}/products/999999', json={"name": "Non Existent"})
    assert response.status_code == 404

def test_delete_product(client):
    """Test soft deleting a product."""
    cat = create_category_via_api(client, "Product Delete Category")
    product = create_product_via_api(client, "Product to Delete", cat['id'], "pcs")
    response = client.delete(f'{INVENTORY_BASE_URL}/products/{product["id"]}')
    assert response.status_code == 200
    assert response.json == {"message": "Product deleted"}
    get_response = client.get(f'{INVENTORY_BASE_URL}/products')
    assert get_response.status_code == 200
    data = get_response.json
    deleted_product_present = any(p['id'] == product['id'] for p in data)
    assert not deleted_product_present

def test_delete_product_not_found(client):
    """Test deleting a non-existent product."""
    response = client.delete(f'{INVENTORY_BASE_URL}/products/999999')
    assert response.status_code == 404

# --- PURCHASE TESTS ---

def test_create_purchase(client, app):
    """Test creating a new purchase order with multiple items."""
    cat = create_category_via_api(client, "Purchase Category")
    prod1 = create_product_via_api(client, "Item A for Purchase", cat['id'], "pcs")
    prod2 = create_product_via_api(client, "Item B for Purchase", cat['id'], "pcs")

    # Use IDs from app.config which are guaranteed to exist
    supplier_id = app.config['BASE_SUPPLIER_ID']
    store_id = app.config['BASE_STORE_ID']

    purchase_data = {
        "supplier_id": supplier_id,
        "store_id": store_id,
        "date": datetime.date.today().isoformat(),
        "reference_number": "PUR-001",
        "is_paid": False,
        "notes": "Bulk order",
        "items": [
            {"product_id": prod1['id'], "quantity": 5, "unit_cost": 100.00},
            {"product_id": prod2['id'], "quantity": 2, "unit_cost": 250.50}
        ]
    }
    response = client.post(f'{INVENTORY_BASE_URL}/purchases', json=purchase_data)
    assert response.status_code == 201
    data = response.json
    assert data['supplier_id'] == supplier_id
    assert data['store_id'] == store_id
    assert data['id'] is not None
    assert data['reference_number'] == "PUR-001"
    assert data['is_paid'] == False

def test_create_purchase_missing_required_fields(client, app): # Add app fixture
    """Test creating a purchase with missing top-level required fields."""
    purchase_data = {
        "supplier_id": app.config['BASE_SUPPLIER_ID'], # Use a valid ID, even if test is about missing other fields
    }
    response = client.post(f'{INVENTORY_BASE_URL}/purchases', json=purchase_data)
    assert response.status_code == 400
    assert response.json == {"message": "Supplier ID, Store ID, and items are required."}

def test_create_purchase_invalid_item_data(client, app):
    """Test creating a purchase with invalid data in one of the items."""
    cat = create_category_via_api(client, "Invalid Item Category")
    prod1 = create_product_via_api(client, "Invalid Item Product", cat['id'], "pcs")

    supplier_id = app.config['BASE_SUPPLIER_ID']
    store_id = app.config['BASE_STORE_ID']

    purchase_data = {
        "supplier_id": supplier_id,
        "store_id": store_id,
        "items": [
            {"product_id": prod1['id'], "quantity": 5}, # Missing unit_cost
        ]
    }
    response = client.post(f'{INVENTORY_BASE_URL}/purchases', json=purchase_data)
    assert response.status_code == 400
    assert response.json == {"message": "Each purchase item must have product_id, quantity, and unit_cost."}

def test_get_purchases(client, app):
    """Test retrieving a list of all purchase orders."""
    cat = create_category_via_api(client, "Get Purchases Category")
    prod = create_product_via_api(client, "Get Purchases Product", cat['id'], "pcs")

    supplier_id_base = app.config['BASE_SUPPLIER_ID']
    store_id_base = app.config['BASE_STORE_ID']

    # It's better to create *another* supplier if you need truly distinct IDs for testing filtering
    # For now, let's just use the same base supplier for simplicity to ensure success.
    # If your backend requires multiple distinct suppliers for filtering, you'd extend conftest or create here.
    
    # Create distinct suppliers if strictly needed for testing supplier_id variation in GET/filter
    # To reliably get a second supplier, you might need to create it here or modify conftest.
    # For robust testing, consider creating a dedicated helper in conftest to make new suppliers.
    # For this fix, let's rely on the base supplier and ensure purchase items use actual products.

    purchase1_data = {
        "supplier_id": supplier_id_base, "store_id": store_id_base, "reference_number": "GET-P001", "items": [{"product_id": prod['id'], "quantity": 1, "unit_cost": 10}]
    }
    purchase2_data = {
        "supplier_id": supplier_id_base, "store_id": store_id_base, "reference_number": "GET-P002", "items": [{"product_id": prod['id'], "quantity": 1, "unit_cost": 10}]
    }
    create_purchase_via_api(client, **purchase1_data)
    create_purchase_via_api(client, **purchase2_data)

    response = client.get(f'{INVENTORY_BASE_URL}/purchases')
    assert response.status_code == 200 # Expecting 200 OK for GET
    data = response.json
    assert len(data) >= 2
    reference_numbers = {p['reference_number'] for p in data if 'reference_number' in p}
    assert "GET-P001" in reference_numbers
    assert "GET-P002" in reference_numbers


def test_filter_purchases_by_supplier(client, app):
    """Test filtering purchases by supplier ID."""
    cat = create_category_via_api(client, "Filter Supplier Category")
    prod = create_product_via_api(client, "Filter Supplier Product", cat['id'], "pcs")

    # Use the base supplier and create a new supplier explicitly for testing filter
    supplier_id_filter_1 = app.config['BASE_SUPPLIER_ID']
    
    # Create a new supplier for the second set of purchases to ensure distinct filtering
    # This assumes your backend creates the Supplier on demand or that you have a way to create them.
    # If not, you'd need to add a helper function to create a supplier via API or extend conftest.
    # For demonstration, let's create it via a post request if your API supports it.
    # If not, you'd need to directly insert into db in conftest or use the base supplier for all.
    new_supplier_name = "Unique Filter Supplier"
    response_new_supplier = client.post(
        '/api/inventory/suppliers', # Assuming you have a supplier endpoint
        json={"name": new_supplier_name, "contact_person": "Jane Doe", "email": "jane@example.com", "phone": "123-456-7890", "address": "123 Main St"}
    )
    assert response_new_supplier.status_code == 201, "Failed to create new supplier for filtering test"
    supplier_id_filter_2 = response_new_supplier.json['id']

    store_id = app.config['BASE_STORE_ID']

    # Purchases for supplier_id_filter_1
    create_purchase_via_api(client, supplier_id_filter_1, store_id, [{"product_id": prod['id'], "quantity": 1, "unit_cost": 10}], reference_number="SUP-F001-A")
    create_purchase_via_api(client, supplier_id_filter_1, store_id, [{"product_id": prod['id'], "quantity": 1, "unit_cost": 10}], reference_number="SUP-F001-B")

    # Purchases for supplier_id_filter_2
    create_purchase_via_api(client, supplier_id_filter_2, store_id, [{"product_id": prod['id'], "quantity": 1, "unit_cost": 10}], reference_number="SUP-F002-A")
    create_purchase_via_api(client, supplier_id_filter_2, store_id, [{"product_id": prod['id'], "quantity": 1, "unit_cost": 10}], reference_number="SUP-F002-B")

    # Act: Filter by supplier_id_filter_1
    response = client.get(f'{INVENTORY_BASE_URL}/purchases/filter?supplier_id={supplier_id_filter_1}')

    # Assert
    assert response.status_code == 200 # Corrected status code assertion
    data = response.json
    reference_numbers = {p['reference_number'] for p in data if 'reference_number' in p}
    assert "SUP-F001-A" in reference_numbers
    assert "SUP-F001-B" in reference_numbers
    assert "SUP-F002-A" not in reference_numbers
    assert "SUP-F002-B" not in reference_numbers

    # Act: Filter by supplier_id_filter_2
    response_2 = client.get(f'{INVENTORY_BASE_URL}/purchases/filter?supplier_id={supplier_id_filter_2}')
    assert response_2.status_code == 200
    data_2 = response_2.json
    reference_numbers_2 = {p['reference_number'] for p in data_2 if 'reference_number' in p}
    assert "SUP-F002-A" in reference_numbers_2
    assert "SUP-F002-B" in reference_numbers_2
    assert "SUP-F001-A" not in reference_numbers_2
    assert "SUP-F001-B" not in reference_numbers_2