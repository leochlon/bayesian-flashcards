from flask import Blueprint, request, jsonify
import sys
import os
# Adjust import paths to be absolute
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Deck, Card, User, db
from bayesian.scheduler import Scheduler
from bayesian.model import sample_next_review
import traceback

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

@cards_bp.route('/api/next_card/<deck>', methods=['GET'])
def next_card_get(deck):
    """Get next card with user as query parameter."""
    user = request.args.get('user', 'default')
    return next_card(deck, user)

@cards_bp.route('/api/next_card/<deck>/<user>', methods=['GET'])
def next_card(deck, user):
    """Get the next card to review for a specific deck and user."""
    print(f"Request for next card - deck: {deck}, user: {user}")
    
    # Get or create user
    user_obj = User.query.filter_by(username=user).first()
    if not user_obj:
        print(f"Creating new user: {user}")
        user_obj = User(username=user)
        db.session.add(user_obj)
        db.session.commit()
    
    # Get deck
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        print(f"Error: Deck not found: {deck}")
        return jsonify({'error': 'Deck not found', 'success': False}), 404
        
    if not deck_obj.cards or len(deck_obj.cards) == 0:
        print(f"Error: No cards in deck {deck}")
        return jsonify({'error': 'No cards in deck', 'success': False}), 404
    
    print(f"Found {len(deck_obj.cards)} cards in deck {deck}")
    
    # Get max_reviews_per_card from query param if provided
    try:
        max_reviews_per_card = request.args.get('max_reviews_per_card', type=int)
    except Exception:
        max_reviews_per_card = None
    # Use the scheduler to get the next card
    try:
        scheduler = Scheduler(user_obj, deck_obj.cards)
        next_card = scheduler.select_next_card(
            max_reviews_per_card=max_reviews_per_card
        )
        
        if not next_card:
            return jsonify({'error': 'No more cards to review', 'success': False}), 404
            
        print(f"Selected card ID: {next_card.id}")
    except Exception as e:
        print(f"Error selecting next card: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'success': False}), 500
    
    # Get interval prediction
    try:
        interval, _ = sample_next_review(next_card, user_obj)
        
        stats = {
            "next_interval": interval,
            "pomodoro_time": user_obj.pomodoro_length
        }
        
        # Convert card to dict to ensure all fields are serializable
        card_dict = next_card.to_dict()
        
        print(f"Returning card data for card ID: {next_card.id}")
        
        # Return in the structure expected by the frontend
        return jsonify({
            "success": True,
            "next_card": {**card_dict, "stats": stats}
        })
    except Exception as e:
        print(f"Error preparing card response: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'success': False}), 500

@cards_bp.route('/api/review/<deck>/<user>', methods=['POST'])
def review_card(deck, user):
    """Submit a review for a card."""
    print(f"Receiving review for deck: {deck}, user: {user}")
    try:
        data = request.json
        print(f"Review data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided', 'success': False}), 400
            
        card_id = data.get('id')
        rating = data.get('rating')
        session_id = data.get('session_id')
        
        if card_id is None:
            return jsonify({'error': 'Card ID is required', 'success': False}), 400
            
        if rating is None:
            return jsonify({'error': 'Rating is required', 'success': False}), 400
        
        # Get or create user
        user_obj = User.query.filter_by(username=user).first()
        if not user_obj:
            user_obj = User(username=user)
            db.session.add(user_obj)
            db.session.commit()
        
        # Find the card
        card = Card.query.get(card_id)
        if not card:
            return jsonify({'error': 'Card not found', 'success': False}), 404
        
        # Use active session from the user profile if not explicitly provided
        if not session_id and user_obj.active_session_id:
            session_id = user_obj.active_session_id
        
        # Add the review
        card.add_review(rating, session_id)
        user_obj.add_recall(0, rating >= 7)  # Simple success/fail based on rating
        
        db.session.commit()
        
        # Get the deck object
        deck_obj = Deck.query.filter_by(name=deck).first()
        if not deck_obj:
            return jsonify({'error': 'Deck not found', 'success': False}), 404
        
        # Get max_reviews_per_card from POST body if provided
        max_reviews_per_card = data.get('max_reviews_per_card') if data else None
        # Get next card using scheduler
        print(f"Getting next card after review")
        scheduler = Scheduler(user_obj, deck_obj.cards)
        next_card = scheduler.select_next_card(
            max_reviews_per_card=max_reviews_per_card
        )
        
        if not next_card:
            return jsonify({'error': 'No more cards to review', 'success': False}), 404
        
        print(f"Next card ID: {next_card.id}")
        
        # Get interval prediction for next card
        interval, _ = sample_next_review(next_card, user_obj)
        
        stats = {
            "next_interval": interval,
            "pomodoro_time": user_obj.pomodoro_length,
            "session_id": session_id
        }
        
        # Convert card to dict to ensure all fields are serializable
        card_dict = next_card.to_dict()
        
        return jsonify({
            'success': True,
            'next_card': {**card_dict, "stats": stats}
        })
    except Exception as e:
        print(f"Error in review_card: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'success': False}), 500

@cards_bp.route('/api/cards/<deck>/<card_id>', methods=['DELETE'])
def delete_card(deck, card_id):
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        return jsonify({'error': 'Deck not found'}), 404
    card = Card.query.get(card_id)
    if not card:
        return jsonify({'error': 'Card not found'}), 404
    try:
        deck_obj.cards.remove(card)
        from models import Review  # avoid circular import
        Review.query.filter_by(card_id=card.id).delete()
        db.session.delete(card)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e), 'success': False}), 500
