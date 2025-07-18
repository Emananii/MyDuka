from app.models import Product, Inventory, db
from sqlalchemy.exc import SQLAlchemyError
from uuid import uuid4


class InventoryService:

    @staticmethod
    def create_product(data, current_user):
        try:
            product = Product(
                id=str(uuid4()),
                name=data['name'],
                description=data.get('description'),
                price=data['price'],
                category=data.get('category'),
                store_id=current_user.store_id,
                added_by=current_user.id
            )
            db.session.add(product)
            db.session.commit()
            return product
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def update_product(product_id, data, current_user):
        product = Product.query.filter_by(id=product_id, store_id=current_user.store_id).first()
        if not product:
            return None
        product.name = data.get('name', product.name)
        product.description = data.get('description', product.description)
        product.price = data.get('price', product.price)
        product.category = data.get('category', product.category)
        try:
            db.session.commit()
            return product
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_product(product_id, current_user):
        product = Product.query.filter_by(id=product_id, store_id=current_user.store_id).first()
        if not product:
            return False
        try:
            db.session.delete(product)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def add_stock(data, current_user):
        try:
            inventory = Inventory(
                id=str(uuid4()),
                store_id=current_user.store_id,
                product_id=data['product_id'],
                quantity=data['quantity'],
                updated_by=current_user.id
            )
            db.session.add(inventory)
            db.session.commit()
            return inventory
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def update_stock(stock_id, data, current_user):
        inventory = Inventory.query.filter_by(id=stock_id, store_id=current_user.store_id).first()
        if not inventory:
            return None
        inventory.quantity = data.get('quantity', inventory.quantity)
        try:
            db.session.commit()
            return inventory
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_store_inventory(store_id):
        inventory = Inventory.query.filter_by(store_id=store_id).all()
        return inventory
