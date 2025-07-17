from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.hybrid import hybrid_property
from . import db
from app.auth.utils import hash_password, verify_password  # ✅ Added: Import Argon2 utilities

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
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Store(BaseModel):
    __tablename__ = 'stores'

    name = db.Column(db.String, nullable=False)
    address = db.Column(db.String)

    users = db.relationship('User', backref='store')
    store_products = db.relationship('StoreProduct', backref='store')
    sales = db.relationship('Sale', backref='store')
    purchases = db.relationship('Purchase', backref='store')
    supply_requests = db.relationship('SupplyRequest', backref='store')

class User(BaseModel):
    __tablename__ = 'users'

    name = db.Column(db.String, nullable=False)
    email = db.Column(db.String, nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)  # ✅ Changed: Renamed and length set for Argon2
    role = db.Column(db.Enum('merchant', 'admin', 'clerk', 'cashier', name='user_roles'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), index=True)

    # ✅ New: Creator tracking
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # Optional: Track who created this user
    creator = db.relationship('User', remote_side='User.id', backref='created_users')

    sales = db.relationship('Sale', backref='cashier', foreign_keys='Sale.cashier_id')
    supply_requests = db.relationship('SupplyRequest', backref='clerk', foreign_keys='SupplyRequest.clerk_id')
    approved_supply_requests = db.relationship('SupplyRequest', backref='admin', foreign_keys='SupplyRequest.admin_id')
    initiated_transfers = db.relationship('StockTransfer', backref='initiator', foreign_keys='StockTransfer.initiated_by')
    approved_transfers = db.relationship('StockTransfer', backref='approver', foreign_keys='StockTransfer.approved_by')

    def __init__(self, name, email, password, role, store_id=None, created_by=None):  # ✅ Added created_by
        self.name = name
        self.email = email
        self.password_hash = hash_password(password)  # ✅ Secure Argon2 hash
        self.role = role
        self.store_id = store_id
        self.created_by = created_by

    def check_password(self, password):
        return verify_password(self.password_hash, password)  # ✅ Secure verification

    def to_dict(self):
        data = super().to_dict()
        data.pop('password_hash', None)  # ✅ Hide sensitive info
        return data

    def __repr__(self):  # ✅ Optional: useful debug info
        return f"<User {self.email} ({self.role})>"

class Category(BaseModel):
    __tablename__ = 'categories'

    name = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)

    products = db.relationship('Product', backref='category')

class Product(BaseModel):
    __tablename__ = 'products'

    name = db.Column(db.String, nullable=False)
    sku = db.Column(db.String, unique=True)
    unit = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))

    store_products = db.relationship('StoreProduct', backref='product')
    purchase_items = db.relationship('PurchaseItem', backref='product')
    sale_items = db.relationship('SaleItem', backref='product')
    supply_requests = db.relationship('SupplyRequest', backref='product')
    stock_transfer_items = db.relationship('StockTransferItem', backref='product')

class StoreProduct(BaseModel):
    __tablename__ = 'store_products'

    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity_in_stock = db.Column(db.Integer, default=0)
    quantity_spoilt = db.Column(db.Integer, default=0)
    low_stock_threshold = db.Column(db.Integer, default=10)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Sale(BaseModel):
    __tablename__ = 'sales'

    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    cashier_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    total_amount = db.Column(db.Numeric(10, 2))
    payment_status = db.Column(db.Enum('paid', 'unpaid', name='payment_status'), nullable=False)

    sale_items = db.relationship('SaleItem', backref='sale')

class SaleItem(BaseModel):
    __tablename__ = 'sale_items'

    sale_id = db.Column(db.Integer, db.ForeignKey('sales.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity = db.Column(db.Integer, nullable=False)
    price_at_sale = db.Column(db.Numeric(10, 2))

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

    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'))
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    date = db.Column(db.Date)
    reference_number = db.Column(db.String)
    is_paid = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)

    purchase_items = db.relationship('PurchaseItem', backref='purchase')

class PurchaseItem(BaseModel):
    __tablename__ = 'purchase_items'

    purchase_id = db.Column(db.Integer, db.ForeignKey('purchases.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2))

class SupplyRequest(BaseModel):
    __tablename__ = 'supply_requests'

    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    clerk_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    requested_quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum('pending', 'approved', 'declined', name='supply_status'), default='pending')
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    admin_response = db.Column(db.Text)

class StockTransfer(BaseModel):
    __tablename__ = 'stock_transfers'

    from_store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    to_store_id = db.Column(db.Integer, db.ForeignKey('stores.id'))
    initiated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    status = db.Column(db.Enum('pending', 'approved', 'rejected', name='transfer_status'), default='pending')
    transfer_date = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)

    stock_transfer_items = db.relationship('StockTransferItem', backref='transfer')

class StockTransferItem(BaseModel):
    __tablename__ = 'stock_transfer_items'

    stock_transfer_id = db.Column(db.Integer, db.ForeignKey('stock_transfers.id'))
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