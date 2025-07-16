import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

load_dotenv()
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Config
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI", "sqlite:///default.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    app.config.from_object(Config)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    from app import models
    from app.routes.auth import auth_bp
    from app.routes.store_routes import store_bp

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
    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)

    return app
