from app.models import Sale, SaleItem, Product, Inventory, db
from sqlalchemy.exc import SQLAlchemyError
from uuid import uuid4
from datetime import datetime


class SalesService:

    @staticmethod
    def create_sale(data, current_user):
        try:
            sale = Sale(
                id=str(uuid4()),
                store_id=current_user.store_id,
                total_amount=data['total_amount'],
                created_by=current_user.id,
                sale_time=datetime.utcnow()
            )
            db.session.add(sale)

            for item in data['items']:
                product_id = item['product_id']
                quantity = item['quantity']
                price = item['price']

                product = Product.query.filter_by(id=product_id, store_id=current_user.store_id).first()
                if not product:
                    raise ValueError(f"Product ID {product_id} not found in this store.")

                inventory = Inventory.query.filter_by(product_id=product_id, store_id=current_user.store_id).first()
                if not inventory or inventory.quantity < quantity:
                    raise ValueError(f"Insufficient stock for product ID {product_id}.")

                inventory.quantity -= quantity

                sale_item = SaleItem(
                    id=str(uuid4()),
                    sale_id=sale.id,
                    product_id=product_id,
                    quantity=quantity,
                    price=price
                )
                db.session.add(sale_item)

            db.session.commit()
            return sale

        except (SQLAlchemyError, ValueError) as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_sales_by_store(store_id):
        return Sale.query.filter_by(store_id=store_id).all()

    @staticmethod
    def get_sales_by_user(user_id):
        return Sale.query.filter_by(created_by=user_id).all()

    @staticmethod
    def get_sale_items(sale_id):
        return SaleItem.query.filter_by(sale_id=sale_id).all()
