import os
from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS # Keep this import
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler
from flasgger import Swagger

# Load environment variables from .env
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
swagger = Swagger()

# Import the registration function for error handlers
from app.error_handlers import register_error_handlers

def create_app():
    app = Flask(__name__)
    
    # CORS FIX: Full CORS setup for preflight and credentials
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}},
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"])

    # --- Configuration ---
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-dev-key")
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "False").lower() in ('true', '1', 't')
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

    # Flasgger configuration
    app.config['SWAGGER'] = {
        'title': 'MyDuka API',
        'uiversion': 3,
        # ✅ FIX: REMOVE OR COMMENT OUT THIS 'headers' KEY ENTIRELY
        # 'headers': [
        #     ('Access-Control-Allow-Origin', '*'),
        #     ('Access-Control-Allow-Methods', "GET, POST, PUT, DELETE, OPTIONS"),
        #     ('Access-Control-Allow-Credentials', "true"),
        # ],
        'specs': [
            {
                'endpoint': 'apispec_1',
                'route': '/apispec_1.json',
                'rule_filter': lambda rule: True,
                'model_filter': lambda tag: True,
            }
        ],
        'static_url_path': '/flasgger_static',
        'swagger_ui_bundle_path': '/flasgger_static/swagger-ui-bundle.js',
        'swagger_ui_css_path': '/flasgger_static/swagger-ui.css',
        'securityDefinitions': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
            }
        },
        'security': [
            {'Bearer': []}
        ]
    }


    # --- Initialize Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    # Ensure Flask-CORS is initialized for your app

    swagger.init_app(app)

    # --- Import Models (needed for Flask-Migrate) ---
    from app import models

    # --- Register Blueprints ---
    from app.routes.auth_routes import auth_bp
    from app.routes.store_routes import store_bp
    from app.routes.sales_routes import sales_bp
    from app.routes.inventory_routes import inventory_bp
    from app.routes.report_routes import report_bp
    from app.routes.user_routes import users_api_bp
    from app.users.routes import users_bp as teammate_users_bp
    from app.routes.supplier_routes import suppliers_bp

    # NEW: Import your supply_bp blueprint
    from app.routes.supply_routes import supply_bp # Adjust path if different, e.g., app.blueprints.supply_routes

    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(users_api_bp)
    app.register_blueprint(suppliers_bp)

    # NEW: Register your supply_bp blueprint
    app.register_blueprint(supply_bp)

    # CORS configuration should be after blueprint registration
    CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"], "supports_credentials": True}})

    # --- Register Global Error Handlers ---
    register_error_handlers(app)

    # --- NEW: Root Route for Swagger UI ---
    @app.route('/')
    def index():
        """
        Redirects to the Swagger UI documentation.
        ---
        responses:
          302:
            description: Redirect to Swagger UI
        """
        return redirect(url_for('flasgger.apidocs'))

    @app.route('/test_connection')
    def test_connection():
        return "Connection successful from Flask backend!"


    # --- Configure Logging ---
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
        formatter = logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)

        app.logger.addHandler(file_handler)

        app.logger.setLevel(logging.INFO)
        app.logger.info('Application startup')

    return app
