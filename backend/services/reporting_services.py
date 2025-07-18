from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import Sale, Product, Store, StoreProduct
from app import db


def get_daily_summary(store_id):
    today = datetime.utcnow().date()
    start = datetime(today.year, today.month, today.day)
    end = start + timedelta(days=1)

    return _generate_summary(store_id, start, end)


def get_weekly_summary(store_id):
    today = datetime.utcnow().date()
    start = datetime(today.year, today.month, today.day) - timedelta(days=today.weekday()) 
    end = start + timedelta(days=7)

    return _generate_summary(store_id, start, end)


def get_monthly_summary(store_id):
    today = datetime.utcnow().date()
    start = datetime(today.year, today.month, 1)
    if today.month == 12:
        end = datetime(today.year + 1, 1, 1)
    else:
        end = datetime(today.year, today.month + 1, 1)

    return _generate_summary(store_id, start, end)


def _generate_summary(store_id, start_date, end_date):
    results = (
        db.session.query(
            func.sum(Sale.quantity).label('total_quantity'),
            func.sum(Sale.total_price).label('total_revenue')
        )
        .filter(Sale.store_id == store_id)
        .filter(Sale.created_at >= start_date, Sale.created_at < end_date)
        .first()
    )

    return {
        "store_id": store_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_quantity_sold": results.total_quantity or 0,
        "total_revenue": float(results.total_revenue) if results.total_revenue else 0.0
    }


def get_top_products(store_id, limit=5):
    results = (
        db.session.query(
            Product.name,
            func.sum(Sale.quantity).label("total_sold")
        )
        .join(Sale, Product.id == Sale.product_id)
        .filter(Sale.store_id == store_id)
        .group_by(Product.id)
        .order_by(func.sum(Sale.quantity).desc())
        .limit(limit)
        .all()
    )

    top_products = [{"product": r.name, "quantity_sold": r.total_sold} for r in results]
    return {
        "store_id": store_id,
        "top_products": top_products
    }
