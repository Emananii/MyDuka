from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.reporting_services import (
    get_daily_summary,
    get_weekly_summary,
    get_monthly_summary,
    get_top_products
)

report_bp = Blueprint("report_bp", __name__, url_prefix="/reports")


@report_bp.route('/daily/<int:store_id>', methods=['GET'])
@jwt_required()
def daily_summary(store_id):
    """
    Get daily sales summary for a specific store.
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: store_id
        in: path
        type: integer
        required: true
        description: The ID of the store.
        example: 1
    responses:
      200:
        description: Daily sales summary successfully retrieved.
        schema:
          type: object
          properties:
            date:
              type: string
              format: date
              example: 2024-07-17
            total_sales:
              type: number
              format: float
              example: 1500.75
            total_items_sold:
              type: integer
              example: 50
            # Add other relevant fields for your daily summary
      401:
        description: Unauthorized - Missing or invalid token.
        schema:
          type: object
          properties:
            msg:
              type: string
              example: Missing Authorization Header
      404:
        description: Store not found or no data for the day.
    """
    summary = get_daily_summary(store_id)
    return jsonify(summary), 200


@report_bp.route('/weekly/<int:store_id>', methods=['GET'])
@jwt_required()
def weekly_summary(store_id):
    """
    Get weekly sales summary for a specific store.
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: store_id
        in: path
        type: integer
        required: true
        description: The ID of the store.
        example: 1
    responses:
      200:
        description: Weekly sales summary successfully retrieved.
        schema:
          type: object
          properties:
            start_date:
              type: string
              format: date
              example: 2024-07-14
            end_date:
              type: string
              format: date
              example: 2024-07-20
            total_sales:
              type: number
              format: float
              example: 7500.50
            total_items_sold:
              type: integer
              example: 250
            # Add other relevant fields for your weekly summary
      401:
        description: Unauthorized - Missing or invalid token.
      404:
        description: Store not found or no data for the week.
    """
    summary = get_weekly_summary(store_id)
    return jsonify(summary), 200


@report_bp.route('/monthly/<int:store_id>', methods=['GET'])
@jwt_required()
def monthly_summary(store_id):
    """
    Get monthly sales summary for a specific store.
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: store_id
        in: path
        type: integer
        required: true
        description: The ID of the store.
        example: 1
    responses:
      200:
        description: Monthly sales summary successfully retrieved.
        schema:
          type: object
          properties:
            month:
              type: string
              example: "July 2024"
            total_sales:
              type: number
              format: float
              example: 30000.00
            total_items_sold:
              type: integer
              example: 1000
            # Add other relevant fields for your monthly summary
      401:
        description: Unauthorized - Missing or invalid token.
      404:
        description: Store not found or no data for the month.
    """
    summary = get_monthly_summary(store_id)
    return jsonify(summary), 200


@report_bp.route('/top-products/<int:store_id>', methods=['GET'])
@jwt_required()
def top_products(store_id):
    """
    Get a list of top-selling products for a specific store.
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: store_id
        in: path
        type: integer
        required: true
        description: The ID of the store.
        example: 1
      - name: limit
        in: query
        type: integer
        required: false
        default: 5
        description: The maximum number of top products to return.
        example: 10
    responses:
      200:
        description: Top products list successfully retrieved.
        schema:
          type: array
          items:
            type: object
            properties:
              product_id:
                type: integer
                example: 101
              product_name:
                type: string
                example: "Laptop X"
              total_quantity_sold:
                type: integer
                example: 150
              total_sales_amount:
                type: number
                format: float
                example: 75000.00
      401:
        description: Unauthorized - Missing or invalid token.
      404:
        description: Store not found or no product data.
    """
    limit = request.args.get('limit', default=5, type=int)
    results = get_top_products(store_id, limit=limit)
    return jsonify(results), 200