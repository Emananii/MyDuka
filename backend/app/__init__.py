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
    # app.config["CORS_HEADERS"] = "Content-Type" # Already commented out, good!
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "False").lower() in ('true', '1', 't')

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
    CORS(app) # This should now work correctly without interference
    swagger.init_app(app)

    # --- Import Models (needed for Flask-Migrate) ---
    from app import models 

    # --- Register Blueprints ---
    from app.routes.auth_routes import auth_bp
    from app.routes.store_routes import store_bp
    from app.routes.sales_routes import sales_bp
    from app.routes.inventory_routes import inventory_bp
    from app.routes.report_routes import report_bp  
    from app.users.routes import users_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(inventory_bp , url_prefix='/api')
    app.register_blueprint(report_bp) 
    app.register_blueprint(users_bp, url_prefix='/users')


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