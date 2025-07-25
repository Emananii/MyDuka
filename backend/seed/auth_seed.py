import sys
import os

# Add the project root to the Python path to allow for 'app' module import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Store

def seed_auth():
    app = create_app()

    with app.app_context():
        print("🔄 Dropping all tables...")
        db.drop_all()
        print("✅ Creating all tables...")
        db.create_all()

        print("🌱 Seeding test data...")

        # Create test store
        store = Store(name="Test Store", address="123 Main St")
        db.session.add(store)
        db.session.commit()

        # Create Merchant user (first user)
        merchant = User(
            name="Admin User",
            email="merchant@example.com",
            password="adminpass123",  # plain password; User.__init__ hashes it
            role="merchant",
            is_active=True,
            store_id=store.id,
            # ✅ FIX: Removed 'last_login_at=None' here as it's not a constructor argument
        )
        db.session.add(merchant)
        db.session.commit()

        print("✅ Seeding complete.")
        print("📧 Email: merchant@example.com")
        print("🔑 Password: adminpass123")

if __name__ == "__main__":
    seed_auth()