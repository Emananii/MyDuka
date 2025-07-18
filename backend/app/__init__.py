import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import logging # Import logging module
from logging.handlers import RotatingFileHandler # Import RotatingFileHandler
from flasgger import Swagger # Import Swagger

# Load environment variables from .env
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
swagger = Swagger() # Initialize Flasgger Swagger

# Import the registration function for error handlers
from app.error_handlers import register_error_handlers

def create_app():
    app = Flask(__name__)

    # --- Configuration ---
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI", "sqlite:///default.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-dev-key")
    app.config["CORS_HEADERS"] = "Content-Type"
    # Set Flask's debug mode based on environment variable (optional but good practice)
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "False").lower() in ('true', '1', 't')

    # Flasgger configuration
    app.config['SWAGGER'] = {
        'title': 'Your Application API',
        'uiversion': 3,
        'headers': [
            ('Access-Control-Allow-Origin', '*'),
            ('Access-Control-Allow-Methods', "GET, POST, PUT, DELETE, OPTIONS"),
            ('Access-Control-Allow-Credentials', "true"),
        ],
        'specs': [
            {
                'endpoint': 'apispec_1',
                'route': '/apispec_1.json',
                'rule_filter': lambda rule: True,  # all in
                'model_filter': lambda tag: True,  # all in
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
    CORS(app)
    swagger.init_app(app) # Initialize Flasgger with your app

    # --- Import Models (needed for Flask-Migrate) ---
    # It's generally better to import models within the application context or blueprints
    # to avoid circular imports and ensure they are registered with SQLAlchemy correctly.
    # However, for Flask-Migrate to discover them, they need to be imported somewhere
    # where they are visible when `flask db` commands are run.
    # The current import here is fine for that purpose.
    from app import models 
    # (No need to list all models explicitly if 'models' module is imported)


    # --- Register Blueprints ---
    from app.routes.auth_routes import auth_bp
    from app.routes.store_routes import store_bp
    from app.routes.sales_routes import sales_bp
    from app.routes.inventory_routes import inventory_bp
    from app.routes.report_routes import report_bp  
    from app.users.routes import users_bp # Assuming you want to register your users blueprint too

    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(report_bp) 
    app.register_blueprint(users_bp, url_prefix='/users') # Example with url_prefix


    # --- Register Global Error Handlers ---
    register_error_handlers(app)

    # --- Configure Logging ---
    # Only configure file logging if not in debug mode and not running tests
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
        # Define a formatter for log messages
        formatter = logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO) # Set the logging level for the file handler

        app.logger.addHandler(file_handler) # Add the file handler to Flask's logger

        app.logger.setLevel(logging.INFO) # Set the overall logging level for the app logger
        app.logger.info('Application startup') # Log a message on startup

    return app