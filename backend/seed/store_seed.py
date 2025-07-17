from app import create_app, db
from app.models import User, Store
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    db.session.query(User).delete()
    db.session.query(Store).delete()

    store = Store(name="Downtown Store", address="Moi Avenue")
    db.session.add(store)
    db.session.flush()  

    merchant = User(
        name="Victor Merchant",
        email="merchant@myduka.com",
        password_digest=generate_password_hash("merchant123"),
        role="merchant",
        store_id=store.id
    )
    db.session.add(merchant)

    db.session.commit()
    print("Seeded merchant + store successfully.")
