import pytest
from decimal import Decimal
from app import db
from app.models import Store, User, Product, StoreProduct, Sale, SaleItem
import uuid # Import uuid for generating unique IDs

@pytest.fixture(scope='function') # Explicitly setting scope for clarity, though 'function' is default
def setup_data(app): # Add 'app' fixture dependency to access app context if needed
    # Ensure a clean slate for this fixture's data creation,
    # though the 'session' fixture in conftest handles overall rollback.
    # We create unique data here to avoid conflicts with other tests or base seeded data.

    # Generate unique email for the cashier
    unique_cashier_email = f"jane_doe_{uuid.uuid4()}@example.com"

    # Use unique names for store and product SKUs to prevent potential conflicts
    store = Store(name=f"Test Store {uuid.uuid4()}", address="123 Main St")
    db.session.add(store)
    db.session.commit() # Commit to get store.id

    cashier = User(
        name="Jane Doe",
        email=unique_cashier_email, # Use unique email
        password="securepassword",
        role="cashier",
        store_id=store.id
    )
    db.session.add(cashier)
    db.session.commit() # Commit to get cashier.id

    product1 = Product(name="Apples", sku=f"APL{uuid.uuid4().hex[:6]}", unit="kg", description="Fresh Apples")
    product2 = Product(name="Oranges", sku=f"ORG{uuid.uuid4().hex[:6]}", unit="kg", description="Juicy Oranges")
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
        "products": [product1, product2],
        "store_products": [store_product1, store_product2]
    }


def test_create_valid_sale(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0]
    store_product2 = setup_data["store_products"][1]

    # CHANGED: Removed '/api' prefix from URL
    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 2},
            {"store_product_id": store_product2.id, "quantity": 1}
        ]
    })

    assert response.status_code == 201
    data = response.get_json()
    sale_id = data["sale_id"]

    sale = db.session.get(Sale, sale_id)
    assert sale is not None
    items = {item.store_product_id: item for item in sale.sale_items}

    expected_total = (
        items[store_product1.id].price_at_sale * 2 +
        items[store_product2.id].price_at_sale * 1
    )
    assert sale.total == expected_total


def test_sale_with_insufficient_stock(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0]

    # CHANGED: Removed '/api' prefix from URL
    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 999999}
        ]
    })

    assert response.status_code == 400
    assert "Not enough stock" in response.get_json()["error"]


def test_sale_with_invalid_store_product_id(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]

    # CHANGED: Removed '/api' prefix from URL
    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": 999999, "quantity": 1}
        ]
    })

    # CHANGED: Updated assertion to safely check for 'error' or 'message' and then for "not found"
    assert response.status_code == 404
    response_json = response.get_json()
    error_message = response_json.get("error") or response_json.get("message")
    assert error_message is not None
    assert "not found" in error_message.lower()


def test_sale_with_negative_quantity(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0]

    # CHANGED: Removed '/api' prefix from URL
    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": -2}
        ]
    })

    assert response.status_code == 400
    assert "Quantity for a sale item must be positive" in response.get_json()["error"]


def test_sale_with_missing_fields(client):
    # CHANGED: Removed '/api' prefix from URL
    response = client.post("/sales", json={})
    assert response.status_code == 400
    assert "Missing required fields" in response.get_json()["error"]


def test_total_calculation(client, setup_data):
    cashier = setup_data["cashier"]
    store = setup_data["store"]
    store_product1 = setup_data["store_products"][0]
    store_product2 = setup_data["store_products"][1]

    # CHANGED: Removed '/api' prefix from URL
    response = client.post("/sales", json={
        "cashier_id": cashier.id,
        "store_id": store.id,
        "payment_status": "paid",
        "sale_items": [
            {"store_product_id": store_product1.id, "quantity": 3},
            {"store_product_id": store_product2.id, "quantity": 2}
        ]
    })

    assert response.status_code == 201
    data = response.get_json()
    sale_id = data["sale_id"]

    sale = db.session.get(Sale, sale_id)
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

    # CHANGED: Removed '/api' prefix from URL
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

    sale = db.session.get(Sale, sale_id)
    item_to_delete = next((item for item in sale.sale_items if not item.is_deleted), None)
    assert item_to_delete is not None
    item_to_delete.is_deleted = True
    db.session.commit()

    updated_sale = db.session.get(Sale, sale_id)
    remaining_items = [item for item in updated_sale.sale_items if not item.is_deleted]
    expected_total = sum(item.price_at_sale * item.quantity for item in remaining_items)

    assert updated_sale.total == expected_total