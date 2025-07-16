# app/__init__.py

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Load config
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI", "sqlite:///default.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config.from_object(Config)

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    # Import models after db init
    from . import models
    from .models import (
        Store, User, Category, Product, StoreProduct, Sale, SaleItem,
        Supplier, Purchase, PurchaseItem, SupplyRequest,
        StockTransfer, StockTransferItem, AuditLog
    )

    # Register blueprints
    from app .routes.auth import auth_bp
    from app .routes.store_routes import store_bp
    from app .routes.routes import routes 

    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(routes)

    return app
