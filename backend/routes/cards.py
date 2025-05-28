from flask import Blueprint, request, jsonify
from models import Deck, Card, db

cards_bp = Blueprint('cards', __name__)

@cards_bp.route('/api/cards/<deck>', methods=['GET', 'POST'])
def cards(deck):
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        return jsonify({'error': 'Deck not found'}), 404
    if request.method == 'GET':
        cards = [card.to_dict() for card in deck_obj.cards]
        return jsonify(cards)
    else:
        card_data = request.json
        new_card = Card(
            front=card_data.get('front', ''),
            back=card_data.get('back', ''),
            front_image=card_data.get('frontImage'),
            back_image=card_data.get('backImage'),
            card_type=card_data.get('type', 'Basic')
        )
        deck_obj.cards.append(new_card)
        db.session.add(new_card)
        db.session.commit()
        return jsonify({'success': True, 'id': new_card.id})
