# conftest.py (modifications within the 'session' fixture)

import pytest
import datetime
from app import create_app, db

# Correct imports for your models:
from app.models import (
    Category,
    Product,
    Purchase,
    PurchaseItem,
    StoreProduct,
    Supplier,
    Store, 
    User
)

from app.auth.utils import hash_password

@pytest.fixture(scope='session')
def app():
    """
    Sets up the Flask app for testing.
    Uses an in-memory SQLite database and creates/drops all database tables once per session.
    """
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", # Use an in-memory SQLite database for testing
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "PROPAGATE_EXCEPTIONS": True,
        "JWT_SECRET_KEY": "your-super-secret-test-key-for-jwt"
    })

    with app.app_context():
        # db.create_all() # We will create tables per function in the 'session' fixture now for SQLite isolation.
        # This app fixture will only configure the app, not seed the DB now.

        # Store general app configs, but not specific IDs which will be created per test
        # app.config['BASE_USER_EMAIL'] = "base.admin@example.com"
        # app.config['BASE_USER_PASSWORD'] = "base_password"

        print(f"\n--- Conftest Debug Info (App Fixture Init) ---")
        print(f"App config initialized for testing.")
        print(f"--- End Conftest Debug Info (App Fixture Init) ---\n")

        yield app

        # db.session.remove() # Handled by session fixture
        # db.drop_all()       # Handled by session fixture or not needed with per-function setup.
        # For in-memory SQLite with per-function setup, dropping all after session is less critical
        # as each function gets a fresh database context.

@pytest.fixture(scope='function')
def session(app):
    """
    Provides a SQLAlchemy session that rolls back changes after each test function.
    This ensures complete test isolation by creating and seeding the DB per test function.
    """
    with app.app_context():
        # Connect to a named in-memory database to potentially share it,
        # or just manage a fresh one per connection.
        # For true isolation, an unnamed in-memory DB is fine.
        # Let's stick to the current pattern, but ensure data is seeded within the connection.

        connection = db.engine.connect()
        transaction = connection.begin()

        db.session.configure(bind=connection)
        db.session.begin_nested() # Begin a savepoint for test function changes

        # --- RE-SEED BASE DATA FOR EACH TEST FUNCTION'S ISOLATED SESSION ---
        db.create_all() # Create tables for this specific connection/transaction

        base_supplier = Supplier(
            name="Base Test Supplier",
            contact_person="Base John Doe",
            email="base.supplier@example.com",
            phone="111-222-3333",
            address="Base Supplier St",
            notes="Base supplier for all tests."
        )
        db.session.add(base_supplier)

        base_store = Store(
            name="Base Test Store",
            address="Base Test Ave"
        )
        db.session.add(base_store)

        base_user = User(
            name="Base Admin User",
            email="base.admin@example.com",
            password="base_password",
            role="admin"
        )
        db.session.add(base_user)

        db.session.commit() # Commit the base records to this test's session

        # Store IDs in app config for easy access in tests
        app.config['BASE_SUPPLIER_ID'] = base_supplier.id
        app.config['BASE_STORE_ID'] = base_store.id
        app.config['BASE_USER_ID'] = base_user.id
        app.config['BASE_USER_EMAIL'] = base_user.email
        app.config['BASE_USER_PASSWORD'] = "base_password"

        print(f"\n--- Conftest Debug Info (Session Fixture Setup) ---")
        print(f"BASE_SUPPLIER_ID from app.config: {app.config.get('BASE_SUPPLIER_ID')}")
        print(f"BASE_STORE_ID from app.config: {app.config.get('BASE_STORE_ID')}")
        print(f"BASE_USER_ID from app.config: {app.config.get('BASE_USER_ID')}")
        print(f"--- End Conftest Debug Info (Session Fixture Setup) ---\n")

        yield db.session # Yield the session to the test function

        # Teardown: Rollback the nested transaction and close the connection
        if db.session.is_active:
            db.session.rollback()  # Rollback the nested transaction (savepoint)
        transaction.rollback() # Rollback the outer transaction as well
        connection.close()
        db.session.remove()
        db.drop_all() # Drop all tables created for this test function

@pytest.fixture(scope='function')
def client(app, session):
    """
    Provides a test client for the Flask app.
    It implicitly uses the isolated session from the 'session' fixture.
    """
    with app.test_client() as client:
        yield client

@pytest.fixture(scope='function')
def runner(app):
    """Provides a CLI runner for testing custom Flask CLI commands."""
    return app.test_cli_runner()