from flask import Blueprint, request, jsonify
from models import Deck, db

decks_bp = Blueprint('decks', __name__)

@decks_bp.route('/api/decks', methods=['GET', 'POST', 'HEAD', 'OPTIONS'])
def decks():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    if request.method == 'HEAD':
        return jsonify([])
    if request.method == 'GET':
        try:
            decks = []
            for deck in Deck.query.all():
                deck_data = {
                    'name': deck.name,
                    'card_count': len(deck.cards),
                    'date_created': deck.date_created.isoformat() if deck.date_created else None
                }
                decks.append(deck_data)
            return jsonify(decks)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:  # POST
        try:
            data = request.json
            deck_name = data.get('deck')
            if not deck_name:
                return jsonify({'error': 'Deck name is required'}), 400
            existing_deck = Deck.query.filter_by(name=deck_name).first()
            if existing_deck:
                return jsonify({'error': 'Deck already exists'}), 400
            new_deck = Deck(name=deck_name)
            db.session.add(new_deck)
            db.session.commit()
            return jsonify({'success': True, 'deck': deck_name})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
