import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    # Config
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI", "sqlite:///default.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models AFTER initializing db
    
    from .models import (
        Store,
        User,
        Category,
        Product,
        StoreProduct,
        Sale,
        SaleItem,
        Supplier,
        Purchase,
        PurchaseItem,
        SupplyRequest,
        StockTransfer,
        StockTransferItem,
        AuditLog
    )
    

    # Register routes AFTER importing models
    from .routes import routes
    app.register_blueprint(routes)

    return app
