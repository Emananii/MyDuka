# app/__init__.py

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # --- Configuration ---
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI", "sqlite:///default.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-dev-key")
   # app.config["CORS_HEADERS"] = "Content-Type"

    # --- Initialize Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
   # CORS(app)

    # --- Import Models (needed for Flask-Migrate) ---
    from app.models import (
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

    # --- Register Blueprints ---
    from app.routes.auth_routes import auth_bp
    from app.routes.store_routes import store_bp
    from app.routes.sales_routes import sales_bp
    from app.routes.inventory_routes import inventory_bp
    from app.routes.user_routes import users_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(users_bp)
    from . import models


    return app
