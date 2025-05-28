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

@decks_bp.route('/api/decks/<deck_name>', methods=['DELETE'])
def delete_deck(deck_name):
    from models import Review, Session, Card  # avoid circular import
    deck = Deck.query.filter_by(name=deck_name).first()
    if not deck:
        return jsonify({'error': 'Deck not found', 'success': False}), 404
    try:
        # Delete all reviews for cards in this deck first
        for card in deck.cards:
            Review.query.filter_by(card_id=card.id).delete()
        # Delete all sessions for this deck
        Session.query.filter_by(deck_id=deck.id).delete()
        # Delete all cards in the deck (using the many-to-many relationship)
        cards_to_delete = list(deck.cards)
        for card in cards_to_delete:
            db.session.delete(card)
        db.session.delete(deck)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e), 'success': False}), 500
