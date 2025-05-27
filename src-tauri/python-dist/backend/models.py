from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import uuid

db = SQLAlchemy()

# Association table for deck-card relationship
deck_cards = db.Table('deck_cards',
    db.Column('deck_id', db.Integer, db.ForeignKey('deck.id'), primary_key=True),
    db.Column('card_id', db.Integer, db.ForeignKey('card.id'), primary_key=True)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    recall_history = db.Column(db.Text, default='[]')  # JSON string of (interval, success) tuples
    global_decay = db.Column(db.Float, default=0.03)
    pomodoro_length = db.Column(db.Integer, default=25)  # minutes
    break_length = db.Column(db.Integer, default=5)  # minutes
    session_fatigue = db.Column(db.Integer, default=0)
    focus_drop_count = db.Column(db.Integer, default=0)
    active_session_id = db.Column(db.String(36), nullable=True)
    
    # Bayesian hyperparameters
    prior_alpha = db.Column(db.Float, default=1.0)
    prior_beta = db.Column(db.Float, default=1.0)
    target_recall = db.Column(db.Float, default=0.7)
    n_samples = db.Column(db.Integer, default=3000)
    history_window = db.Column(db.Integer, default=5)
    
    # Scheduler hyperparameters
    backlog_limit = db.Column(db.Integer, default=50)
    max_reviews_per_card = db.Column(db.Integer, default=2)
    new_cards_per_session = db.Column(db.Integer, default=3)
    mature_cards_per_session = db.Column(db.Integer, default=5)
    
    sessions = db.relationship('Session', backref='user_profile', lazy=True)
    
    def get_recall_history(self):
        if not self.recall_history:
            return []
        return json.loads(self.recall_history)
    
    def add_recall(self, interval, success):
        history = self.get_recall_history()
        history.append([interval, 1 if success else 0])
        self.recall_history = json.dumps(history)
        self.update_decay()
    
    def update_decay(self):
        history = self.get_recall_history()
        if not history or len(history) < 10:
            return
        
        # Use the last 50 entries
        recent = history[-50:]
        fail_intervals = [iv for iv, s in recent if s == 0]
        
        if fail_intervals:
            import numpy as np
            est_halflife = np.mean(fail_intervals)
            self.global_decay = np.log(2) / est_halflife
        else:
            self.global_decay = 0.03
    
    def start_session(self, session_id):
        self.active_session_id = session_id
    
    def end_session(self):
        self.active_session_id = None
    
    def get_hyperparameters(self):
        """Return all tunable hyperparameters as a dictionary"""
        return {
            # Bayesian parameters
            'prior_alpha': self.prior_alpha,
            'prior_beta': self.prior_beta,
            'global_decay': self.global_decay,
            'target_recall': self.target_recall,
            'n_samples': self.n_samples,
            'history_window': self.history_window,
            
            # Scheduler parameters
            'backlog_limit': self.backlog_limit,
            'max_reviews_per_card': self.max_reviews_per_card,
            'new_cards_per_session': self.new_cards_per_session,
            'mature_cards_per_session': self.mature_cards_per_session,
            
            # User experience parameters
            'pomodoro_length': self.pomodoro_length,
            'break_length': self.break_length
        }
    
    def update_hyperparameters(self, params):
        """Update hyperparameters from a dictionary"""
        valid_params = [
            'prior_alpha', 'prior_beta', 'global_decay', 'target_recall',
            'n_samples', 'history_window', 'backlog_limit', 'max_reviews_per_card',
            'new_cards_per_session', 'mature_cards_per_session',
            'pomodoro_length', 'break_length'
        ]
        
        for param, value in params.items():
            if param in valid_params and hasattr(self, param):
                setattr(self, param, value)
    
    def recompute_posterior_without_sessions(self, session_ids):
        """Recompute recall history excluding specific sessions"""
        if not session_ids:
            return
            
        # Get all reviews from excluded sessions
        excluded_reviews = Review.query.filter(Review.session_id.in_(session_ids)).all()
        excluded_card_reviews = {}
        
        for review in excluded_reviews:
            if review.card_id not in excluded_card_reviews:
                excluded_card_reviews[review.card_id] = []
            excluded_card_reviews[review.card_id].append(review)
        
        # Rebuild recall history without these reviews
        new_history = []
        current_history = self.get_recall_history()
        
        # This is a simplified approach - in practice, you'd need to map
        # recall history entries to specific reviews, which requires additional tracking
        # For now, we'll just recalculate from all remaining reviews
        all_remaining_reviews = Review.query.filter(~Review.session_id.in_(session_ids)).all()
        
        for review in all_remaining_reviews:
            # Simple mapping - this could be enhanced with better tracking
            new_history.append([0, 1 if review.rating >= 7 else 0])
        
        self.recall_history = json.dumps(new_history)
        self.update_decay()


class Deck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.now)
    
    # Many-to-many relationship with Card
    cards = db.relationship('Card', secondary=deck_cards, lazy='subquery',
                           backref=db.backref('decks', lazy=True))
    
    # One-to-many relationship with Session
    sessions = db.relationship('Session', backref='deck_info', lazy=True)


class Card(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    front = db.Column(db.Text, nullable=False)
    back = db.Column(db.Text, nullable=False)
    front_image = db.Column(db.Text)  # Base64 encoded image
    back_image = db.Column(db.Text)  # Base64 encoded image
    card_type = db.Column(db.String(50), default="Basic")
    date_added = db.Column(db.DateTime, default=datetime.now)
    
    # Card SRS data
    reviews = db.relationship('Review', backref='card_info', lazy=True)
    mature_streak = db.Column(db.Integer, default=0)
    last_wrong = db.Column(db.DateTime, nullable=True)
    is_mature = db.Column(db.Boolean, default=False)
    
    def add_review(self, rating, session_id=None):
        review = Review(
            card_id=self.id,
            rating=rating,
            session_id=session_id
        )
        db.session.add(review)
        
        # Update card maturity status
        if rating >= 7:
            self.mature_streak += 1
            if self.mature_streak >= 4:
                self.is_mature = True
        else:
            self.mature_streak = 0
            self.is_mature = False
            self.last_wrong = datetime.now()
    
    def get_ratings(self):
        return [review.rating for review in self.reviews]
    
    def get_review_times(self):
        return [review.timestamp for review in self.reviews]
    
    def review_count(self):
        return len(self.reviews)
    
    def time_since_added(self):
        return (datetime.now() - self.date_added).total_seconds() / 60
    
    def to_dict(self):
        latest_review = max((r.timestamp for r in self.reviews), default=None) if self.reviews else None
        return {
            'id': self.id,
            'front': self.front,
            'back': self.back,
            'frontImage': self.front_image,
            'backImage': self.back_image,
            'type': self.card_type,
            'last_review': latest_review.isoformat() if latest_review else None,
            'review_count': len(self.reviews),
            'is_mature': self.is_mature
        }


class Session(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    deck_id = db.Column(db.Integer, db.ForeignKey('deck.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.now)
    end_time = db.Column(db.DateTime, nullable=True)
    
    # Relationship with Review
    reviews = db.relationship('Review', backref='session_info', lazy=True)
    
    # Add explicit references to user_profile and deck_info relations (they are defined in the parent models' backrefs)
    # but making them explicit here for better code readability
    
    def add_review(self, card_id, rating):
        review = Review(
            card_id=card_id,
            rating=rating,
            session_id=self.id
        )
        db.session.add(review)
    
    def end_session(self):
        self.end_time = datetime.now()
    
    def duration(self):
        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds() / 60
    
    def success_rate(self):
        if not self.reviews:
            return 0
        return sum(review.rating >= 7 for review in self.reviews) / len(self.reviews)
    
    def cards_studied(self):
        # Return unique card IDs that were reviewed in this session
        return len(set(review.card_id for review in self.reviews))
    
    def reviews_count(self):
        return len(self.reviews)
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "deck": self.deck_info.name,
            "user": self.user_profile.username,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": self.duration(),
            "cards_studied": self.cards_studied(),
            "reviews_count": self.reviews_count(),
            "success_rate": self.success_rate(),
        }


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    card_id = db.Column(db.Integer, db.ForeignKey('card.id'), nullable=False)
    session_id = db.Column(db.String(36), db.ForeignKey('session.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.now)
    rating = db.Column(db.Integer, nullable=False)  # 0-10 rating