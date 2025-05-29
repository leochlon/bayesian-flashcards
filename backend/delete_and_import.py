import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import app
from models import db, Deck, Card, deck_cards

# First, check existing decks
with app.app_context():
    decks = Deck.query.all()
    print(f"Found {len(decks)} existing decks:")
    for deck in decks:
        card_count = len(deck.cards)
        print(f"- {deck.name} ({card_count} cards)")
    
    # Delete all existing decks and their cards
    print("\nDeleting all decks and cards...")
    
    # Delete from association table first to prevent constraint violations
    db.session.execute(deck_cards.delete())
    
    # Delete all cards
    Card.query.delete()
    
    # Delete all decks
    Deck.query.delete()
    
    # Commit the changes
    db.session.commit()
    print("All decks and cards have been deleted.")
    
    # Now import flashcards from the JSON file
    print("\nImporting cards from interview_flashcards.json...")
    os.system('python scripts/import_interview_flashcards.py')
