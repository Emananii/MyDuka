from app.models import Store, SupplyRequest, StockTransfer, User, db
from sqlalchemy.exc import SQLAlchemyError
from flask import jsonify
from uuid import uuid4

class StoreService:

    @staticmethod
    def create_store(data, current_user):
        try:
            new_store = Store(
                id=str(uuid4()),
                name=data['name'],
                location=data.get('location'),
                merchant_id=current_user.id
            )
            db.session.add(new_store)
            db.session.commit()
            return new_store
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def update_store(store_id, data, current_user):
        store = Store.query.filter_by(id=store_id, merchant_id=current_user.id).first()
        if not store:
            return None
        store.name = data.get('name', store.name)
        store.location = data.get('location', store.location)
        try:
            db.session.commit()
            return store
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_store(store_id, current_user):
        store = Store.query.filter_by(id=store_id, merchant_id=current_user.id).first()
        if not store:
            return False
        try:
            db.session.delete(store)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def invite_user_to_store(data, current_user):
        try:
            user = User.query.filter_by(email=data["email"]).first()
            if not user:
                return {"error": "User not found"}, 404
            user.store_id = data["store_id"]
            user.role = data["role"]
            db.session.commit()
            return {"message": "User invited successfully"}
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def create_supply_request(data, current_user):
        try:
            new_request = SupplyRequest(
                id=str(uuid4()),
                product_id=data['product_id'],
                store_id=current_user.store_id,
                quantity=data['quantity'],
                requested_by=current_user.id,
                status='pending'
            )
            db.session.add(new_request)
            db.session.commit()
            return new_request
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def respond_to_supply_request(request_id, response, current_user):
        request = SupplyRequest.query.filter_by(id=request_id).first()
        if not request or request.status != 'pending':
            return None
        request.status = response.get('status', request.status)
        request.admin_response = response.get('admin_response', '')
        try:
            db.session.commit()
            return request
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def transfer_stock(data, current_user):
        try:
            transfer = StockTransfer(
                id=str(uuid4()),
                from_store_id=data["from_store_id"],
                to_store_id=data["to_store_id"],
                product_id=data["product_id"],
                quantity=data["quantity"],
                initiated_by=current_user.id
            )
            db.session.add(transfer)
            db.session.commit()
            return transfer
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e
