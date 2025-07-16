from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from .routes.sales_routes import sales_bp

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://emmanuel:password@localhost:5432/myduka"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(sales_bp)

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

    return app
