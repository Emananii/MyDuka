from flask import Blueprint, request, jsonify
from app.models import Supplier
from app import db
from datetime import datetime

suppliers_bp = Blueprint('suppliers', __name__, url_prefix='/api/suppliers')

@suppliers_bp.route('/', methods=['GET'])
def get_suppliers():
    """
    Fetches all active suppliers.
    """
    suppliers = Supplier.query.filter_by(is_deleted=False).all()
    return jsonify([supplier.to_dict() for supplier in suppliers]), 200

@suppliers_bp.route('/<int:supplier_id>', methods=['GET'])
def get_supplier(supplier_id):
    """
    Fetches a single supplier by ID.
    """
    supplier = Supplier.query.filter_by(id=supplier_id, is_deleted=False).first()
    if not supplier:
        return jsonify({"message": "Supplier not found"}), 404
    return jsonify(supplier.to_dict()), 200

@suppliers_bp.route('/', methods=['POST'])
def add_supplier():
    """
    Adds a new supplier.
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    name = data.get('name')
    contact_person = data.get('contact_person')
    phone = data.get('phone')
    email = data.get('email')
    address = data.get('address')
    notes = data.get('notes')

    if not name:
        return jsonify({"message": "Supplier name is required"}), 400

    # Basic validation for uniqueness (optional, but good for email/phone)
    if email and Supplier.query.filter_by(email=email, is_deleted=False).first():
        return jsonify({"message": "Supplier with this email already exists"}), 409
    if phone and Supplier.query.filter_by(phone=phone, is_deleted=False).first():
        return jsonify({"message": "Supplier with this phone number already exists"}), 409

    new_supplier = Supplier(
        name=name,
        contact_person=contact_person,
        phone=phone,
        email=email,
        address=address,
        notes=notes
    )

    try:
        db.session.add(new_supplier)
        db.session.commit()
        return jsonify(new_supplier.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error adding supplier", "error": str(e)}), 500

@suppliers_bp.route('/<int:supplier_id>', methods=['PUT'])
def update_supplier(supplier_id):
    """
    Updates an existing supplier by ID.
    """
    supplier = Supplier.query.filter_by(id=supplier_id, is_deleted=False).first()
    if not supplier:
        return jsonify({"message": "Supplier not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    # Update fields if present in the request data
    if 'name' in data:
        supplier.name = data['name']
    if 'contact_person' in data:
        supplier.contact_person = data['contact_person']
    if 'phone' in data:
        supplier.phone = data['phone']
    if 'email' in data:
        supplier.email = data['email']
    if 'address' in data:
        supplier.address = data['address']
    if 'notes' in data:
        supplier.notes = data['notes']

    try:
        db.session.commit()
        return jsonify(supplier.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error updating supplier", "error": str(e)}), 500

@suppliers_bp.route('/<int:supplier_id>', methods=['DELETE'])
def delete_supplier(supplier_id):
    """
    Marks a supplier as deleted (soft delete).
    """
    supplier = Supplier.query.filter_by(id=supplier_id, is_deleted=False).first()
    if not supplier:
        return jsonify({"message": "Supplier not found"}), 404

    supplier.is_deleted = True
    try:
        db.session.commit()
        return jsonify({"message": "Supplier marked as deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error deleting supplier", "error": str(e)}), 500