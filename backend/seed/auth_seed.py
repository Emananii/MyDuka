from app import create_app, db
from app.models import User, Store

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
        name="Emmanuel",
        email="emmanuelwambugu5@gmail.com",
        password="@12345",  # plain password; User.__init__ hashes it
        role="merchant",
        is_active=True,
        store_id=store.id
    )
    db.session.add(merchant)
    db.session.commit()

    print("✅ Seeding complete.")
    print("📧 Email: emmanuelwambugu5@gmail.com")
    print("🔑 Password: @12345")
