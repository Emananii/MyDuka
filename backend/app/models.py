from datetime import datetime, timezone
from enum import Enum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import select, func
from app import db  # ✅ resolves circular import

from app.auth.utils import hash_password, verify_password
from decimal import Decimal
from datetime import datetime, timedelta  # Add timedelta to existing datetime import
import secrets  # Add this new import
# --- Import Models (needed for Flask-Migrate) ---

class SerializerMixin:
    def to_dict(self):
        return {
            column.key: getattr(self, column.key)
            for column in self.__mapper__.columns  # type: ignore
            if not column.key.startswith('_')
        }


class BaseModel(db.Model, SerializerMixin):
    __abstract__ = True
    id = db.Column(db.Integer, primary_key=True)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Store(BaseModel):
    __tablename__ = 'stores'

    name = db.Column(db.String, nullable=False)
    address = db.Column(db.String)

    users = db.relationship('User', backref='store')
    store_products = db.relationship('StoreProduct', backref='store')
    sales = db.relationship('Sale', backref='store')
    purchases = db.relationship('Purchase', backref='store')
    supply_requests = db.relationship('SupplyRequest', backref='store')



 #(Add 'import secrets' and 'from datetime import timedelta' to your existing imports)

class InvitationToken(db.Model):
    __tablename__ = 'invitation_tokens'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Changed from invited_by
    role = db.Column(db.String(50), nullable=False, default='admin')
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=True)
    is_used = db.Column(db.Boolean, default=False, nullable=False)  # Changed from used
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)  # Added this field
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships - Updated to match new field names
    inviter = db.relationship('User', foreign_keys=[user_id], backref='sent_invitations')
    store = db.relationship('Store', backref='invitations')
    
    def __init__(self, email, user_id, role='admin', store_id=None, expires_hours=24):
        """Initialize invitation token"""
        self.email = email.lower().strip()
        self.user_id = user_id  # Changed from invited_by
        self.role = role
        self.store_id = store_id
        self.token = self._generate_token()
        self.expires_at = datetime.utcnow() + timedelta(hours=expires_hours)
        self.is_used = False
        self.is_deleted = False
    
    def _generate_token(self):
        """Generate a secure random token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    @classmethod
    def generate_token(cls, email, role, store_id, user_id, expires_hours=24):
        """Class method to create a new invitation token - matches your routes"""
        return cls(
            email=email,
            user_id=user_id,  # Changed from invited_by
            role=role,
            store_id=store_id,
            expires_hours=expires_hours
        )
    
    def is_expired(self):
        """Check if invitation has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if invitation is valid (not used, not deleted, not expired)"""
        return not self.is_used and not self.is_deleted and not self.is_expired()
    
    def mark_as_used(self):
        """Mark invitation as used"""
        self.is_used = True
    
    def soft_delete(self):
        """Soft delete the invitation"""
        self.is_deleted = True
    
    def to_dict(self):
        """Convert invitation to dictionary - required by your routes"""
        return {
            'id': self.id,
            'token': self.token,
            'email': self.email,
            'user_id': self.user_id,
            'role': self.role,
            'store_id': self.store_id,
            'is_used': self.is_used,
            'is_deleted': self.is_deleted,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<InvitationToken {self.email} - {self.role}>'
    


class User(BaseModel):
    __tablename__ = 'users'

    name = db.Column(db.String, nullable=False)
    email = db.Column(db.String, nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.Enum('merchant', 'admin', 'clerk',
                     'cashier', name='user_roles'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), index=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    creator = db.relationship(
        'User', remote_side='User.id', backref='created_users')

    sales = db.relationship('Sale', backref='cashier',
                            foreign_keys='Sale.cashier_id')
    supply_requests = db.relationship(
        'SupplyRequest', backref='clerk', foreign_keys='SupplyRequest.clerk_id')
    approved_supply_requests = db.relationship(
        'SupplyRequest', backref='admin', foreign_keys='SupplyRequest.admin_id')
    initiated_transfers = db.relationship(
        'StockTransfer', backref='initiator', foreign_keys='StockTransfer.initiated_by')
    approved_transfers = db.relationship(
        'StockTransfer', backref='approver', foreign_keys='StockTransfer.approved_by')

    def __init__(self, name, email, password, role, store_id=None, created_by=None, is_active=True):
        self.name = name
        self.email = email
        self.password_hash = hash_password(password)
        self.role = role
        self.store_id = store_id
        self.created_by = created_by
        self.is_active = True

    def check_password(self, password):
        return verify_password(self.password_hash, password)

    def to_dict(self):
        data = super().to_dict()
        data.pop('password_hash', None)
        return data

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class Category(BaseModel):
    __tablename__ = 'categories'

    name = db.Column(db.String, nullable=False)
    description = db.Text

    products = db.relationship('Product', backref='category')


class Product(BaseModel):
    __tablename__ = 'products'

    name = db.Column(db.String, nullable=False)
    sku = db.Column(db.String, unique=True)
    unit = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    image_url = db.Column(db.String, nullable=True) # URL for the product image

    store_products = db.relationship('StoreProduct', backref='product')
    purchase_items = db.relationship('PurchaseItem', backref='product')
    supply_requests = db.relationship('SupplyRequest', backref='product')
    stock_transfer_items = db.relationship('StockTransferItem', backref='product')

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "unit": self.unit,
            "description": self.description,
            "image_url": self.image_url,
            "category": self.category.name if self.category else None,
            "category_id": self.category_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class StoreProduct(BaseModel):
    __tablename__ = 'store_products'

    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    
    quantity_in_stock = db.Column(db.Integer, default=0)
    quantity_spoilt = db.Column(db.Integer, default=0)
    low_stock_threshold = db.Column(db.Integer, default=10)

    
    price = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))

    last_updated = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    @hybrid_property
    def current_price(self):
        return self.price or Decimal("0.00")

class Sale(BaseModel):
    __tablename__ = 'sales'

    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    cashier_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    payment_status = db.Column(
        db.Enum('paid', 'unpaid', name='payment_status'),
        nullable=False
    )
    is_deleted = db.Column(db.Boolean, default=False)

    sale_items = db.relationship(
        'SaleItem',
        backref='sale',
        cascade="all, delete-orphan",
        lazy='select' # This is now correct, loads items as InstrumentedList
    )

    @hybrid_property
    def total(self):
        # FIX IS HERE: Filter the InstrumentedList using Python list comprehension
        return sum(
            item.price_at_sale * item.quantity
            for item in self.sale_items if not item.is_deleted # <--- CHANGED THIS LINE
        )

    @total.expression
    def total(cls):
        # This part remains correct as it operates on the database level (SQL expression)
        from . import SaleItem
        return (
            select([func.sum(SaleItem.price_at_sale * SaleItem.quantity)])
            .where((SaleItem.sale_id == cls.id) & (SaleItem.is_deleted == False))
            .label('total')
        )


class SaleItem(BaseModel):
    __tablename__ = 'sale_items'

    sale_id = db.Column(db.Integer, db.ForeignKey('sales.id'), nullable=False)
    store_product_id = db.Column(db.Integer, db.ForeignKey('store_products.id'), nullable=False)

    quantity = db.Column(db.Integer, nullable=False)
    price_at_sale = db.Column(db.Numeric(10, 2), nullable=False)
    store_product = db.relationship('StoreProduct', backref='sale_items')


class Supplier(BaseModel):
    __tablename__ = 'suppliers'

    name = db.Column(db.String, nullable=False)
    contact_person = db.Column(db.String)
    phone = db.Column(db.String)
    email = db.Column(db.String)
    address = db.Column(db.String)
    notes = db.Column(db.Text)

    purchases = db.relationship('Purchase', backref='supplier')


class Purchase(BaseModel):
    __tablename__ = 'purchases'

    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True) # Made nullable true, as per purchase_routes.py
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False) # Made nullable false, as per purchase_routes.py
    date = db.Column(db.Date, nullable=False, default=datetime.now(timezone.utc).date()) # Added default and nullable false as per purchase_routes.py
    reference_number = db.Column(db.String(100), nullable=True) # Added length and nullable true
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00")) # Added this line
    is_paid = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True) # Made nullable true

    purchase_items = db.relationship('PurchaseItem', backref='purchase', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        # Using super().to_dict() to get base attributes, then override/add specifics
        data = super().to_dict()
        # Ensure Decimal is converted to float for JSON serialization
        if 'total_amount' in data and isinstance(data['total_amount'], Decimal):
            data['total_amount'] = float(data['total_amount'])
        
        # Handle datetime and date objects for ISO format
        if 'date' in data and isinstance(data['date'], datetime):
            data['date'] = data['date'].isoformat()
        elif 'date' in data and isinstance(data['date'], (datetime.date)):
             data['date'] = data['date'].isoformat()

        if 'created_at' in data and isinstance(data['created_at'], datetime):
            data['created_at'] = data['created_at'].isoformat()
        if 'updated_at' in data and isinstance(data['updated_at'], datetime):
            data['updated_at'] = data['updated_at'].isoformat()
            
        return data


class PurchaseItem(BaseModel):
    __tablename__ = 'purchase_items'

    purchase_id = db.Column(db.Integer, db.ForeignKey('purchases.id'), nullable=False) # Made nullable false
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False) # Made nullable false
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2), nullable=False) # Made nullable false

    def to_dict(self):
        data = super().to_dict()
        if 'unit_cost' in data and isinstance(data['unit_cost'], Decimal):
            data['unit_cost'] = float(data['unit_cost'])
        data['total_cost'] = float(self.quantity * self.unit_cost)
        return data


class SupplyRequest(BaseModel):
    __tablename__ = 'supply_requests'

    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    clerk_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    requested_quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum('pending', 'approved', 'declined',
                       name='supply_status'), default='pending')
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    admin_response = db.Column(db.Text)

class SupplyRequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    declined = "declined"

    def __str__(self):
        return self.value

class StockTransfer(BaseModel):
    __tablename__ = 'stock_transfers'

    from_store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    to_store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    initiated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    status = db.Column(db.Enum('pending', 'approved', 'rejected',
                       name='transfer_status'), default='pending')
    transfer_date = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    stock_transfer_items = db.relationship('StockTransferItem', backref='transfer')
    # Removed the duplicate stock_transfer_items relationship, kept one


class StockTransferStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

    def __str__(self):
        return self.value

# The duplicate StockTransferStatus enum was removed. Keep only one.


class StockTransferItem(BaseModel):
    __tablename__ = 'stock_transfer_items'

    stock_transfer_id = db.Column(
        db.Integer, db.ForeignKey('stock_transfers.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity = db.Column(db.Integer, nullable=False)


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String, nullable=False)
    entity_type = db.Column(db.String, nullable=False)
    entity_id = db.Column(db.Integer)
    metadata_json = db.Column('metadata', db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='audit_logs')