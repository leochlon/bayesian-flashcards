from flask import Blueprint, request, jsonify
from models import User, db
import math
from datetime import datetime

users_bp = Blueprint('users', __name__)

@users_bp.route('/api/users/<username>/settings', methods=['GET'])
def get_user_settings(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    settings = user.get_hyperparameters()
    cleaned_settings = {}
    for key, value in settings.items():
        if isinstance(value, float):
            if math.isinf(value) or math.isnan(value):
                if 'decay' in key.lower():
                    cleaned_settings[key] = 0.03
                elif 'alpha' in key.lower() or 'beta' in key.lower():
                    cleaned_settings[key] = 1.0
                elif 'recall' in key.lower():
                    cleaned_settings[key] = 0.7
                else:
                    cleaned_settings[key] = 1.0
            else:
                cleaned_settings[key] = value
        else:
            cleaned_settings[key] = value
    if cleaned_settings != settings:
        user.update_hyperparameters(cleaned_settings)
        db.session.commit()
    response = jsonify({
        'success': True,
        'settings': cleaned_settings
    })
    response.headers['Cache-Control'] = 'public, max-age=60'
    response.headers['ETag'] = f'settings-{username}-{datetime.now().strftime("%Y%m%d%H%M")}'
    return response

@users_bp.route('/api/users/<username>/settings', methods=['PUT'])
def update_user_settings(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found', 'success': False}), 404
    try:
        settings = request.json
        user.update_hyperparameters(settings)
        db.session.commit()
        return jsonify({
            'success': True,
            'settings': user.get_hyperparameters()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e), 'success': False}), 500
