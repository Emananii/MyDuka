import pytest
from decimal import Decimal
from app import db
from app.models import Store, User, Product, StoreProduct, Sale, SaleItem


@pytest.fixture
def setup_data(app):
    store = Store(name="Test Store", address="123 Main St")
    db.session.add(store)
    db.session.commit()

    cashier = User(
        name="Jane Doe",
        email="jane@example.com",
        password="securepassword",
        role="cashier",
        store_id=store.id
    )
    db.session.add(cashier)
    db.session.commit()

    product1 = Product(name="Apples", sku="APL001", unit="kg", description="Fresh Apples")
    product2 = Product(name="Oranges", sku="ORG001", unit="kg", description="Juicy Oranges")
    db.session.add_all([product1, product2])
    db.session.commit()

    store_product1 = StoreProduct(
        store_id=store.id,
        product_id=product1.id,
        quantity_in_stock=100,
        price=Decimal("150.00")
    )
    store_product2 = StoreProduct(
        store_id=store.id,
        product_id=product2.id,
        quantity_in_stock=50,
        price=Decimal("200.00")
    )
    db.session.add_all([store_product1, store_product2])
    db.session.commit()

    return {
        "store": store,
        "cashier": cashier,
        "products": [product1, product2], # Still return products for reference if needed
        "store_products": [store_product1, store_product2] # Crucially return store_products
    }


def test_create_valid_sale(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0] # Get store_product
    store_product2 = setup_data["store_products"][1] # Get store_product

    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 2}, # Changed to store_product_id
            {"store_product_id": store_product2.id, "quantity": 1}  # Changed to store_product_id
        ]
    })

    assert response.status_code == 201
    data = response.get_json()
    sale_id = data["sale_id"]

    sale = db.session.get(Sale, sale_id) # Updated from Sale.query.get
    assert sale is not None
    # Use store_product_id for lookup and access price_at_sale directly from SaleItem
    items = {item.store_product_id: item for item in sale.sale_items} 

    expected_total = (
        items[store_product1.id].price_at_sale * 2 +
        items[store_product2.id].price_at_sale * 1
    )
    assert sale.total == expected_total


def test_sale_with_insufficient_stock(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0] # Get store_product

    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 999999} # Changed to store_product_id, large quantity
        ]
    })

    assert response.status_code == 400
    # Updated assertion to check the 'error' field in the JSON response
    assert "Not enough stock" in response.get_json()["error"]


def test_sale_with_invalid_store_product_id(client, setup_data): # Renamed test
    cashier = setup_data["cashier"]
    store = setup_data["store"]

    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": 999999, "quantity": 1} # Changed to store_product_id
        ]
    })

    assert response.status_code == 404
    # Updated assertion to check the 'error' field in the JSON response
    assert "Store product" in response.get_json()["error"] and "not found" in response.get_json()["error"]


def test_sale_with_negative_quantity(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0] # Get store_product

    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": -2} # Changed to store_product_id
        ]
    })

    assert response.status_code == 400
    # Updated assertion to check the 'error' field in the JSON response
    assert "Quantity for a sale item must be positive" in response.get_json()["error"] # Updated assertion


def test_sale_with_missing_fields(client):
    response = client.post("/sales", json={})
    assert response.status_code == 400
    # Updated assertion to check the 'error' field in the JSON response
    assert "Missing required fields" in response.get_json()["error"]


def test_total_calculation(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0]
    store_product2 = setup_data["store_products"][1]

    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 3}, # Changed to store_product_id
            {"store_product_id": store_product2.id, "quantity": 2}  # Changed to store_product_id
        ]
    })

    assert response.status_code == 201
    data = response.get_json()
    sale_id = data["sale_id"]

    sale = db.session.get(Sale, sale_id) # Updated from Sale.query.get
    # Use store_product_id for lookup and access price_at_sale directly from SaleItem
    items = {item.store_product_id: item for item in sale.sale_items} 
    expected_total = (
        items[store_product1.id].price_at_sale * 3 +
        items[store_product2.id].price_at_sale * 2
    )
    assert sale.total == expected_total


def test_sale_soft_delete_and_recalculate_total(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0]
    store_product2 = setup_data["store_products"][1]

    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 1},
            {"store_product_id": store_product2.id, "quantity": 1}
        ]
    })

    assert response.status_code == 201
    sale_id = response.get_json()["sale_id"]

    # Simulate soft-delete of the first item
    sale = db.session.get(Sale, sale_id) # Updated from Sale.query.get
    # Get the first item by order or simply iterate if order isn't guaranteed
    item_to_delete = next((item for item in sale.sale_items if not item.is_deleted), None)
    assert item_to_delete is not None
    item_to_delete.is_deleted = True
    db.session.commit()

    # Re-fetch updated total (or refresh if the object is still in session)
    updated_sale = db.session.get(Sale, sale_id) # Updated from Sale.query.get
    remaining_items = [item for item in updated_sale.sale_items if not item.is_deleted]
    expected_total = sum(item.price_at_sale * item.quantity for item in remaining_items)

    assert updated_sale.total == expected_total
