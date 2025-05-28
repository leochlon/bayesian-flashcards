from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)

@health_bp.route('/api/health', methods=['GET', 'HEAD'])
def health_check():
    return jsonify({"status": "ok", "service": "running"})
