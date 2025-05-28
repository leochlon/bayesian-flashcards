from flask import Blueprint, request, jsonify
from models import User, Deck, Session, db
from datetime import datetime

sessions_bp = Blueprint('sessions', __name__)

@sessions_bp.route('/api/sessions', methods=['GET'])
def get_sessions():
    user_name = request.args.get('user', 'default')
    deck_name = request.args.get('deck')
    user = User.query.filter_by(username=user_name).first()
    if not user:
        return jsonify([])
    query = Session.query.filter_by(user_id=user.id)
    if deck_name:
        deck = Deck.query.filter_by(name=deck_name).first()
        if deck:
            query = query.filter_by(deck_id=deck.id)
    query = query.order_by(Session.start_time.desc())
    sessions = query.all()
    return jsonify([session.to_dict() for session in sessions])

@sessions_bp.route('/api/sessions', methods=['POST'])
def create_session():
    data = request.json
    deck_name = data.get('deck')
    user_name = data.get('user', 'default')
    session_name = data.get('name')
    if not deck_name:
        return jsonify({'error': 'Deck is required', 'success': False}), 400
    user = User.query.filter_by(username=user_name).first()
    if not user:
        user = User(username=user_name)
        db.session.add(user)
    deck = Deck.query.filter_by(name=deck_name).first()
    if not deck:
        return jsonify({'error': 'Deck not found', 'success': False}), 404
    if not deck.cards or len(deck.cards) == 0:
        return jsonify({'error': 'Deck has no cards', 'success': False}), 400
    name = session_name or f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    session = Session(name=name, user_id=user.id, deck_id=deck.id)
    try:
        db.session.add(session)
        db.session.commit()
        user.start_session(session.id)
        db.session.commit()
        return jsonify({'success': True, 'session': session.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e), 'success': False}), 500

@sessions_bp.route('/api/sessions/<session_id>/end', methods=['POST'])
def end_session(session_id):
    session = Session.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found', 'success': False}), 404
    
    session.end_session()
    
    # Update user profile
    user = session.user_profile
    if user:
        user.end_session()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'session': session.to_dict()
    })

@sessions_bp.route('/api/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    from models import Review
    session = Session.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found', 'success': False}), 404
    try:
        # Delete the session and all its reviews
        Review.query.filter_by(session_id=session.id).delete()
        db.session.delete(session)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e), 'success': False}), 500
