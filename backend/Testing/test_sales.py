import pytest
from datetime import datetime
from decimal import Decimal
from app import db
from app.models import Store, User, Product, Sale, SaleItem, Category


@pytest.fixture
def test_data(app):  # app fixture from conftest.py ensures context and db setup
    store = Store(name="Test Store", address="123 Main St")
    user = User(name="Cashier 1", email="cashier@test.com", password="password", role="cashier")
    category = Category(name="Electronics", description="Devices and gadgets")
    product1 = Product(name="Mouse", sku="SKU123", unit="pcs", category=category)
    product2 = Product(name="Keyboard", sku="SKU124", unit="pcs", category=category)

    store.users.append(user)
    db.session.add_all([store, user, category, product1, product2])
    db.session.commit()

    return {
        "store": store,
        "user": user,
        "product1": product1,
        "product2": product2
    }


def test_create_sale_with_items(test_data):
    store = test_data["store"]
    user = test_data["user"]
    product1 = test_data["product1"]
    product2 = test_data["product2"]

    sale = Sale(
        store_id=store.id,
        cashier_id=user.id,
        payment_status="paid",
        created_at=datetime.utcnow()
    )
    db.session.add(sale)
    db.session.commit()

    item1 = SaleItem(
        sale_id=sale.id,
        product_id=product1.id,
        quantity=2,
        price_at_sale=Decimal("50.00")
    )
    item2 = SaleItem(
        sale_id=sale.id,
        product_id=product2.id,
        quantity=1,
        price_at_sale=Decimal("100.00")
    )
    db.session.add_all([item1, item2])
    db.session.commit()

    assert sale.id is not None
    assert sale.sale_items.count() == 2


def test_sale_total_property(test_data):
    store = test_data["store"]
    user = test_data["user"]
    product = test_data["product1"]

    sale = Sale(
        store_id=store.id,
        cashier_id=user.id,
        payment_status="paid"
    )
    db.session.add(sale)
    db.session.commit()

    item = SaleItem(
        sale_id=sale.id,
        product_id=product.id,
        quantity=3,
        price_at_sale=Decimal("20.00")
    )
    db.session.add(item)
    db.session.commit()

    assert sale.total == Decimal("60.00")


def test_sale_item_to_dict(test_data):
    store = test_data["store"]
    user = test_data["user"]
    product = test_data["product1"]

    sale = Sale(store_id=store.id, cashier_id=user.id, payment_status="paid")
    db.session.add(sale)
    db.session.commit()

    item = SaleItem(
        sale_id=sale.id,
        product_id=product.id,
        quantity=2,
        price_at_sale=Decimal("35.50")
    )
    db.session.add(item)
    db.session.commit()

    item_dict = item.to_dict()

    assert isinstance(item_dict, dict)
    assert item_dict["quantity"] == 2
    assert str(item_dict["price_at_sale"]) == "35.50"


def test_sale_relationships(test_data):
    store = test_data["store"]
    user = test_data["user"]
    product = test_data["product2"]

    sale = Sale(store_id=store.id, cashier_id=user.id, payment_status="paid")
    db.session.add(sale)
    db.session.commit()

    item = SaleItem(
        sale_id=sale.id,
        product_id=product.id,
        quantity=1,
        price_at_sale=Decimal("75.00")
    )
    db.session.add(item)
    db.session.commit()

    assert item.sale == sale
    assert item.product == product
    assert sale.cashier.email == user.email