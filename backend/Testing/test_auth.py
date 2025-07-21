import pytest
from decimal import Decimal
from app import db
from app.models import Store, User
from flask_jwt_extended import create_access_token # Used to generate tokens for tests


@pytest.fixture
def setup_auth_data(app):
    """
    Sets up test data for authentication tests: a store and various users.
    Returns a dictionary including users and their generated JWT tokens.
    """
    with app.app_context():
        db.session.query(User).delete()
        db.session.query(Store).delete()
        db.session.commit()

        store = Store(name="Auth Test Store", address="456 Auth Ave")
        db.session.add(store)
        db.session.commit()

        merchant_user = User(
            name="Auth Merchant",
            email="merchant@test.com",
            password="password123",
            role="merchant",
            store_id=store.id
        )
        admin_user = User(
            name="Auth Admin",
            email="admin@test.com",
            password="password123",
            role="admin",
            store_id=store.id
        )
        cashier_user = User(
            name="Auth Cashier",
            email="cashier@test.com",
            password="password123",
            role="cashier",
            store_id=store.id
        )
        clerk_user = User(
            name="Auth Clerk",
            email="clerk@test.com",
            password="password123",
            role="clerk",
            store_id=store.id
        )
        db.session.add_all([merchant_user, admin_user, cashier_user, clerk_user])
        db.session.commit()

        merchant_token = create_access_token(identity=merchant_user.id)
        admin_token = create_access_token(identity=admin_user.id)
        cashier_token = create_access_token(identity=cashier_user.id)
        clerk_token = create_access_token(identity=clerk_user.id)

        return {
            "store": store,
            "merchant_user": merchant_user,
            "admin_user": admin_user,
            "cashier_user": cashier_user,
            "clerk_user": clerk_user,
            "merchant_token": merchant_token,
            "admin_token": admin_token,
            "cashier_token": cashier_token,
            "clerk_token": clerk_token,
        }


# --- Test User Registration ---
def test_register_user_success(client, setup_auth_data):
    """Tests successful user registration by merchant only."""
    merchant_token = setup_auth_data["merchant_token"]
    response = client.post("/api/auth/register", headers={"Authorization": f"Bearer {merchant_token}"}, json={
        "name": "New User",
        "email": "newuser@test.com",
        "password": "newpassword123",
        "role": "clerk",
        "store_id": None
    })
    assert response.status_code == 201
    assert response.json["message"] == "User registered successfully"

def test_register_user_unauthorized_for_non_merchant(client, setup_auth_data):
    """Tests that non-merchants cannot register users."""
    admin_token = setup_auth_data["admin_token"]
    response = client.post("/api/auth/register", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "name": "New User",
        "email": "newuser2@test.com",
        "password": "newpassword123",
        "role": "clerk",
        "store_id": None
    })
    assert response.status_code == 403
    assert "Unauthorized" in response.json.get("error", "")

def test_register_user_missing_fields(client, setup_auth_data):
    merchant_token = setup_auth_data["merchant_token"]
    response = client.post('/api/auth/register', headers={"Authorization": f"Bearer {merchant_token}"}, json={
        "email": "incomplete@example.com",
    })
    assert response.status_code == 400
    assert response.json == {"error": "Email, password, and name are required"}

def test_register_user_existing_email(client, setup_auth_data):
    merchant_user = setup_auth_data["merchant_user"]
    merchant_token = setup_auth_data["merchant_token"]
    response = client.post("/api/auth/register", headers={"Authorization": f"Bearer {merchant_token}"}, json={
        "name": "Duplicate User",
        "email": merchant_user.email,
        "password": "somepassword",
        "role": "clerk"
    })
    assert response.status_code == 400
    assert response.json["error"] == "Email already exists"


# --- Test User Login ---
def test_login_success(client, setup_auth_data):
    merchant_user = setup_auth_data["merchant_user"]
    response = client.post("/api/auth/login", json={
        "email": merchant_user.email,
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json
    assert response.json["user"]["email"] == merchant_user.email
    assert response.json["user"]["role"] == merchant_user.role

def test_login_invalid_credentials(client, setup_auth_data):
    merchant_user = setup_auth_data["merchant_user"]
    response = client.post("/api/auth/login", json={
        "email": merchant_user.email,
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert response.json["error"] == "Invalid credentials"

def test_login_non_existent_user(client):
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "anypassword"
    })
    assert response.status_code == 401
    assert response.json["error"] == "Invalid credentials"

def test_login_missing_credentials(client):
    response = client.post("/api/auth/login", json={
        "email": "test@test.com",
    })
    assert response.status_code == 400
    assert response.json["error"] == "Email and password are required"

def test_login_deactivated_user(client, app, setup_auth_data):
    admin_user = setup_auth_data["admin_user"]
    with app.app_context():
        user_to_deactivate = db.session.get(User, admin_user.id)
        user_to_deactivate.is_active = False
        db.session.commit()
    response = client.post("/api/auth/login", json={
        "email": admin_user.email,
        "password": "password123"
    })
    assert response.status_code == 403
    assert response.json["error"] == "This account has been deactivated"

def test_login_case_insensitive_email(client, setup_auth_data):
    merchant_user = setup_auth_data["merchant_user"]
    response = client.post("/api/auth/login", json={
        "email": merchant_user.email.upper(),
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json
    assert response.json["user"]["email"] == merchant_user.email


# --- Test Who Am I endpoint ---
def test_who_am_i_no_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Missing Authorization Header" in response.json["msg"]


@pytest.fixture
def setup_users_for_management(app):
    with app.app_context():
        db.session.query(User).delete()
        db.session.query(Store).delete()
        db.session.commit()

        store = Store(name="Management Test Store", address="789 Mgt Lane")
        db.session.add(store)
        db.session.commit()

        merchant = User(name="Test Merchant", email="mgt.merchant@test.com", password="pw", role="merchant", store_id=store.id)
        admin = User(name="Test Admin", email="mgt.admin@test.com", password="pw", role="admin", store_id=store.id)
        clerk = User(name="Test Clerk", email="mgt.clerk@test.com", password="pw", role="clerk", store_id=store.id)
        cashier = User(name="Test Cashier", email="mgt.cashier@test.com", password="pw", role="cashier", store_id=store.id)

        db.session.add_all([merchant, admin, clerk, cashier])
        db.session.commit()

        return {
            "store_id": store.id,
            "merchant": merchant,
            "admin": admin,
            "clerk": clerk,
            "cashier": cashier,
            "merchant_token": create_access_token(identity=merchant.id),
            "admin_token": create_access_token(identity=admin.id),
            "clerk_token": create_access_token(identity=clerk.id),
        }


def test_merchant_can_create_admin(client, setup_users_for_management):
    token = setup_users_for_management["merchant_token"]
    store_id = setup_users_for_management["store_id"]
    
    response = client.post(
        "/api/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Admin by Merchant",
            "email": "new.admin@test.com",
            "password": "newpassword",
            "role": "admin",
            "store_id": store_id
        }
    )
    assert response.status_code == 201
    assert "User 'New Admin by Merchant' created successfully" in response.json["message"]
    new_user = User.query.filter_by(email="new.admin@test.com").first()
    assert new_user is not None
    assert new_user.role == "admin"


def test_merchant_cannot_create_clerk(client, setup_users_for_management):
    token = setup_users_for_management["merchant_token"]
    store_id = setup_users_for_management["store_id"]

    response = client.post(
        "/api/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Clerk by Merchant",
            "email": "new.clerk@test.com",
            "password": "newpassword",
            "role": "clerk",
            "store_id": store_id
        }
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json["error"]


def test_admin_can_create_clerk(client, setup_users_for_management):
    token = setup_users_for_management["admin_token"]
    store_id = setup_users_for_management["store_id"]

    response = client.post(
        "/api/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Clerk by Admin",
            "email": "new.clerk.admin@test.com",
            "password": "newpassword",
            "role": "clerk",
            "store_id": store_id
        }
    )
    assert response.status_code == 201
    assert "User 'New Clerk by Admin' created successfully" in response.json["message"]


def test_admin_cannot_create_admin(client, setup_users_for_management):
    token = setup_users_for_management["admin_token"]
    store_id = setup_users_for_management["store_id"]

    response = client.post(
        "/api/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Admin by Admin",
            "email": "new.admin.admin@test.com",
            "password": "newpassword",
            "role": "admin",
            "store_id": store_id
        }
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json["error"]


def test_merchant_can_deactivate_admin(client, app, setup_users_for_management):
    token = setup_users_for_management["merchant_token"]
    admin_to_deactivate = setup_users_for_management["admin"]

    response = client.patch(
        f"/api/users/{admin_to_deactivate.id}/deactivate",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "has been deactivated" in response.json["message"]

    with app.app_context():
        user = User.query.get(admin_to_deactivate.id)
        assert user is not None
        assert user.is_active is False


def test_merchant_can_delete_admin(client, app, setup_users_for_management):
    token = setup_users_for_management["merchant_token"]
    admin_to_delete = setup_users_for_management["admin"]

    response = client.delete(
        f"/api/users/{admin_to_delete.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "has been deleted" in response.json["message"]

    with app.app_context():
        user = User.query.get(admin_to_delete.id)
        assert user is None
