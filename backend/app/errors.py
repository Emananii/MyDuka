# backend/app/errors.py

class APIError(Exception):
    """Base exception for all custom API errors."""
    status_code = 500
    message = "An unexpected error occurred."

    def __init__(self, message=None, status_code=None, payload=None):
        # Call the base Exception constructor with the message
        super().__init__(message if message is not None else self.message)
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload or {}

    def to_dict(self):
        """Converts the error details to a dictionary for JSON response."""
        rv = self.payload.copy()
        rv['error'] = self.message
        return rv

class BadRequestError(APIError):
    """Custom exception for 400 Bad Request errors."""
    status_code = 400
    message = "Bad request."

class NotFoundError(APIError):
    """Custom exception for 404 Not Found errors."""
    status_code = 404
    message = "Resource not found."

class ConflictError(APIError):
    """Custom exception for 409 Conflict errors (e.g., duplicate entry)."""
    status_code = 409
    message = "Conflict with existing resource."

class ForbiddenError(APIError):
    """Custom exception for 403 Forbidden errors (e.g., insufficient permissions)."""
    status_code = 403
    message = "Forbidden: You do not have permission to access this resource."

class UnauthorizedError(APIError):
    """Custom exception for 401 Unauthorized errors (e.g., missing or invalid authentication)."""
    status_code = 401
    message = "Unauthorized: Authentication required or invalid."


class InsufficientStockError(BadRequestError): # Inherits from BadRequestError
    """Custom exception for insufficient stock during a sale."""
    message = "Not enough items in stock."

    def __init__(self, product_name, available_stock, requested_quantity):
        super().__init__(
            message=f"Not enough stock for '{product_name}'. Available: {available_stock}, Requested: {requested_quantity}",
            payload={
                'product_name': product_name,
                'available_stock': available_stock,
                'requested_quantity': requested_quantity
            }
        )
