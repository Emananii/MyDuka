import os
from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
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
    from app.routes.supply_routes import supply_bp
    from app.routes.invitation_routes import invitations_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(users_api_bp)
    app.register_blueprint(suppliers_bp)
    app.register_blueprint(supply_bp)
    
    # Register invitation blueprint with proper URL prefix
    app.register_blueprint(invitations_bp, url_prefix='/api/invitations')
    
    # Register teammate users blueprint
    app.register_blueprint(teammate_users_bp, url_prefix='/api/users')

    # Environment-based CORS origins for better security
    ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    
    # CORS configuration - centralized and clean
    CORS(app, resources={
        r"/*": {
            "origins": ALLOWED_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Debug logging for CORS preflight requests
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            app.logger.info(f"OPTIONS request to: {request.path}")
            app.logger.info(f"Origin: {request.headers.get('Origin')}")
            app.logger.info(f"Access-Control-Request-Method: {request.headers.get('Access-Control-Request-Method')}")
            app.logger.info(f"Access-Control-Request-Headers: {request.headers.get('Access-Control-Request-Headers')}")

    # Debug logging for CORS response headers (only in debug mode)
    @app.after_request
    def after_request(response):
        if app.debug:
            # Log CORS headers being sent for debugging
            cors_headers = {k: v for k, v in response.headers if k.startswith('Access-Control')}
            if cors_headers:
                app.logger.info(f"CORS headers sent: {cors_headers}")
        return response

    # --- Register Global Error Handlers ---
    register_error_handlers(app)

    # --- Root Route for Swagger UI ---
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

    # Test route for invitation system
    @app.route('/api/test_invitations')
    def test_invitations():
        """Test route to verify invitation system is working"""
        return {"message": "Invitation system is configured correctly!"}, 200

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "cors_origins": ALLOWED_ORIGINS,
            "debug_mode": app.debug
        }, 200

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