import pytest
from app import db
from app.models import Store, User
from flask_jwt_extended import create_access_token

@pytest.fixture
def setup_test_data(app):
    with app.app_context():
        # Clean up existing data
        db.session.query(User).delete()
        db.session.query(Store).delete()
        db.session.commit()

        # Create a test store
        store = Store(name="Test Store", address="123 Test St")
        db.session.add(store)
        db.session.commit()

        # Create a merchant user
        merchant = User(
            name="Test Merchant",
            email="merchant@test.com",
            password="password123",
            role="merchant",
            store_id=store.id
        )
        db.session.add(merchant)
        db.session.commit()

        # Create token
        merchant_token = create_access_token(identity=str(merchant.id))

        return {
            "store_id": store.id,
            "merchant": merchant,
            "merchant_token": merchant_token
        }

def test_user_creation(client, setup_test_data):
    """Test that a merchant can create an admin user"""
    token = setup_test_data["merchant_token"]
    store_id = setup_test_data["store_id"]
    
    response = client.post(
        "/api/users/create",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Admin",
            "email": "admin@test.com",
            "password": "adminpass123",
            "role": "admin",
            "store_id": store_id
        }
    )
    
    print(f"Response: {response.status_code} - {response.data}")
    assert response.status_code == 201
    assert "User created" in response.json["message"]
