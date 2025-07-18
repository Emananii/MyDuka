from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.reporting_services import (
    get_daily_summary,
    get_weekly_summary,
    get_monthly_summary,
    get_top_products
)

report_bp = Blueprint("report_bp", __name__, url_prefix="/reports")


@report_bp.route('/daily/<store_id>', methods=['GET'])
@jwt_required()
def daily_summary(store_id):
    summary = get_daily_summary(store_id)
    return jsonify(summary), 200


@report_bp.route('/weekly/<store_id>', methods=['GET'])
@jwt_required()
def weekly_summary(store_id):
    summary = get_weekly_summary(store_id)
    return jsonify(summary), 200


@report_bp.route('/monthly/<store_id>', methods=['GET'])
@jwt_required()
def monthly_summary(store_id):
    summary = get_monthly_summary(store_id)
    return jsonify(summary), 200


@report_bp.route('/top-products/<store_id>', methods=['GET'])
@jwt_required()
def top_products(store_id):
    limit = request.args.get('limit', default=5, type=int)
    results = get_top_products(store_id, limit=limit)
    return jsonify(results), 200
