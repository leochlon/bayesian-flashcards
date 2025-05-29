import json
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app
from models import db, Deck, Card

json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../interview_flashcards.json'))

with open(json_path, 'r') as f:
    data = json.load(f)

created_decks = 0
created_cards = 0
skipped_cards = 0

with app.app_context():
    for entry in data:
        category = entry.get('Category') or entry.get('category')
        front = entry.get('Front') or entry.get('front')
        back = entry.get('Back') or entry.get('back')
        if not (category and front and back):
            print(f"Skipping entry with missing fields: {entry}")
            skipped_cards += 1
            continue
        deck = Deck.query.filter_by(name=category).first()
        if not deck:
            deck = Deck(name=category)
            db.session.add(deck)
            db.session.commit()
            created_decks += 1
            print(f"Created deck: {category}")
        # Check for duplicate card in this deck
        duplicate = False
        for card in deck.cards:
            if card.front == front and card.back == back:
                duplicate = True
                break
        if duplicate:
            print(f"Card already exists in deck '{category}': {front}")
            skipped_cards += 1
            continue
        card = Card(front=front, back=back)
        deck.cards.append(card)
        db.session.add(card)
        db.session.commit()
        created_cards += 1
        print(f"Added card to '{category}': {front}")

print(f"\nImport complete. Decks created: {created_decks}, Cards created: {created_cards}, Cards skipped: {skipped_cards}")
