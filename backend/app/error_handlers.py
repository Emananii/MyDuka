# app/error_handlers.py

from flask import jsonify
from sqlalchemy.exc import SQLAlchemyError
from . import db
from .errors import APIError # Import your base custom error class

def register_error_handlers(app):
    """
    Registers global error handlers for the Flask application.
    """

    @app.errorhandler(APIError)
    def handle_api_error(error):
        """
        Handles custom APIError exceptions and returns a JSON response.
        """
        # Log the error for debugging purposes (optional, but recommended)
        app.logger.error(f"API Error: {error.message} (Status: {error.status_code}, Payload: {error.payload})")
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(SQLAlchemyError)
    def handle_sqlalchemy_error(error):
        """
        Handles SQLAlchemy errors and returns a generic 500 JSON response.
        """
        # Log the full SQLAlchemy error for detailed debugging
        app.logger.exception(f"SQLAlchemy Error: {error}")
        # You might want to rollback the session here if it's not handled in the route
        db.session.rollback()
        response = jsonify({"error": "A database error occurred. Please try again later."})
        response.status_code = 500
        return response

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        """
        Handles any unhandled exceptions and returns a generic 500 JSON response.
        """
        # Log the full traceback for unhandled exceptions
        app.logger.exception(f"Unhandled Exception: {e}")
        db.session.rollback()
        response = jsonify({"error": "An unexpected server error occurred."})
        response.status_code = 500
        return response

    # Example for a specific HTTP error code (e.g., 405 Method Not Allowed)
    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        app.logger.warning(f"Method Not Allowed: {e}")
        response = jsonify({"error": "Method not allowed for this endpoint."})
        response.status_code = 405
        return response

    # Example for 404 Not Found (for routes not defined by your app)
    @app.errorhandler(404)
    def handle_not_found(e):
        app.logger.warning(f"Not Found: {e}")
        response = jsonify({"error": "The requested resource was not found."})
        response.status_code = 404
        return response