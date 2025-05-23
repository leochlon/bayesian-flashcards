from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_migrate import Migrate
from models import db, User, Deck, Card, Session, Review
import json

import numpy as np
from datetime import datetime, timedelta
import random
import matplotlib
matplotlib.use('Agg')  # Use Agg backend which is thread-safe
import matplotlib.pyplot as plt
import scipy.stats
import os
from io import BytesIO

# ------------------- BAYESIAN MODEL -------------------

def bayesian_posterior(card, prior_alpha=1.0, prior_beta=1.0):
    ratings = card.get_ratings()
    if not ratings:
        return prior_alpha, prior_beta
    success = sum(r >= 7 for r in ratings)
    fail = sum(r < 7 for r in ratings)
    return prior_alpha + success, prior_beta + fail

def adaptive_decay(card, user_profile, base_decay=None, history_window=5):
    reviews = card.reviews
    if base_decay is None:
        base_decay = user_profile.global_decay
    if len(reviews) < 2:
        return base_decay
        
    # Get the most recent reviews
    window = sorted(reviews, key=lambda x: x.timestamp)[-history_window:]
    decay = base_decay
    
    for i in range(1, len(window)):
        t0, rating0 = window[i-1].timestamp, window[i-1].rating
        t1, rating1 = window[i].timestamp, window[i].rating
        delta_t = (t1 - t0).total_seconds() / 60
        delta_rating = rating1 - rating0
        if delta_rating < 0:
            decay += abs(delta_rating) * delta_t / 10000
        elif delta_rating > 0 and delta_t > 10:
            decay *= 0.97
            
    # reward for maturity streak
    if card.mature_streak > 3:
        decay *= 0.6
    return max(0.001, decay)

def sample_next_review(card, user_profile, target_recall=0.7, n_samples=3000):
    try:
        alpha, beta = bayesian_posterior(card)
        decay = adaptive_decay(card, user_profile)
        p0_samples = np.random.beta(alpha, beta, n_samples)
        t_samples = []
        for p0 in p0_samples:
            if p0 <= target_recall:
                t_samples.append(1)
            else:
                t = np.log(p0 / target_recall) / decay
                t_samples.append(max(1, t))
        
        # Safely handle streak/age calculation
        try:
            mature_streak = getattr(card, 'mature_streak', 0)
            # Safely call time_since_added
            time_since = 0
            try:
                time_since = card.time_since_added()
            except Exception:
                # If time_since_added fails, calculate directly if possible
                if hasattr(card, 'date_added'):
                    time_since = (datetime.now() - card.date_added).total_seconds() / 60
            
            age_factor = 1 + (mature_streak // 2) + (time_since / (60 * 24 * 7))
            t_samples = [t * age_factor for t in t_samples]
        except Exception as e:
            print(f"Error calculating age factor: {str(e)}")
            # Continue without applying age factor if there's an error
        
        # Add random jitter for multi-scale spacing
        interval = int(np.percentile(t_samples, np.random.uniform(30, 80)))
        return interval, t_samples
    except Exception as e:
        print(f"Error in sample_next_review: {str(e)}")
        # Return default values if anything fails
        return 1, [1] * n_samples

def interval_to_text(minutes):
    if minutes < 60:
        return f"{minutes} minutes"
    elif minutes < 1440:
        return f"{minutes // 60} hours"
    else:
        days = minutes // 1440
        hours = (minutes % 1440) // 60
        return f"{days} days, {hours} hours" if hours else f"{days} days"

def get_recent_posterior(user_profile, window=30, prior_alpha=2, prior_beta=1):
    recent = user_profile.get_recall_history()[-window:]
    successes = sum(s for _, s in recent)
    failures = len(recent) - successes
    alpha = prior_alpha + successes
    beta = prior_beta + failures
    return alpha, beta

def sample_success_rate(alpha, beta, n_samples=1000):
    return np.random.beta(alpha, beta, n_samples)

def bayesian_success_rate_interval(interval, alpha, beta, target=0.8, sensitivity=0.2):
    p_samples = np.random.beta(alpha, beta, 1000)
    mean_p = np.mean(p_samples)
    correction = 1 + sensitivity * (mean_p - target)
    return int(max(1, interval * correction))

# ------------------- SCHEDULER -------------------

class Scheduler:
    def __init__(self, user_profile, cards):
        self.user_profile = user_profile
        self.cards = cards
        self.card_review_counts = {card.id: 0 for card in self.cards}  # For per-session review limits

    def select_next_card(self, backlog_limit=50, max_reviews_per_card=2):
        urgents = []
        news = []
        matures = []
        
        for c in self.cards:
            try:
                # Skip if we've already reviewed this card enough times
                if self.card_review_counts[c.id] >= max_reviews_per_card:
                    continue
                    
                # Safely get review count
                review_count = 0
                try:
                    review_count = c.review_count()
                except Exception:
                    # If review_count method fails, try to calculate directly
                    review_count = len(c.reviews) if hasattr(c, 'reviews') else 0
                
                if review_count == 0:
                    news.append(c)
                elif not getattr(c, 'is_mature', False) or (getattr(c, 'last_wrong', None) and 
                        (datetime.now() - c.last_wrong).total_seconds() / 3600 < 48):
                    urgents.append(c)
                else:
                    matures.append(c)
            except Exception as e:
                print(f"Error processing card {c.id}: {str(e)}")
                # Add to news by default if we have an error
                news.append(c)
                
        random.shuffle(urgents)
        random.shuffle(news)
        random.shuffle(matures)
        
        to_study = urgents[:backlog_limit] + news[:3] + matures[:5]
        if len(to_study) > backlog_limit:
            to_study = to_study[:backlog_limit]
            
        if to_study:
            card = random.choice(to_study)
            self.card_review_counts[card.id] += 1
            return card
        else:
            remaining = [c for c in self.cards if self.card_review_counts[c.id] < max_reviews_per_card]
            if remaining:
                card = random.choice(remaining)
                self.card_review_counts[card.id] += 1
                return card
            return random.choice(self.cards) if self.cards else None

# ------------------- APP CONFIGURATION -------------------

app = Flask(__name__)
# Configure CORS to accept requests from all origins, including the Electron app
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]}})

# Add a health check endpoint
@app.route('/api/health', methods=['GET', 'HEAD'])
def health_check():
    try:
        # Simple health check that doesn't require database access
        return jsonify({"status": "ok", "service": "running"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Database configuration
db_path = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'flashcards.db'))
print(f"Using database at: {db_path}")
app.config['SQLALCHEMY_DATABASE_URI'] = db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy with the Flask app
db.init_app(app)
migrate = Migrate(app, db)

# Create default user if not exists - updated to properly use app_context
def create_default_user():
    with app.app_context():
        try:
            # Check if default user exists
            user = User.query.filter_by(username='default').first()
            if not user:
                print("Creating default user...")
                default_user = User(username='default')
                db.session.add(default_user)
                db.session.commit()
                print("Default user created successfully")
            else:
                print("Default user already exists")
            return True
        except Exception as e:
            print(f"Error creating default user: {str(e)}")
            db.session.rollback()
            return False

# Initialize database and create tables
with app.app_context():
    try:
        print("Creating database tables...")
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Database initialization error: {str(e)}")

# Create default user after tables are created
create_default_user()

# Wrap route handlers with better error handling
@app.errorhandler(500)
def handle_500_error(e):
    print(f"Internal Server Error: {str(e)}")
    return jsonify(error=str(e)), 500

@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Unhandled Exception: {str(e)}")
    return jsonify(error=str(e)), 500

# ------------------- API ROUTES -------------------

@app.route('/api/decks', methods=['GET', 'POST', 'HEAD', 'OPTIONS'])
def decks():
    print(f"Request to /api/decks with method {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    
    # Special handling for OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        print("Responding to OPTIONS request")
        return response
        
    # Special handling for HEAD requests
    if request.method == 'HEAD':
        print("Responding to HEAD request")
        return jsonify([])  # Return empty array for HEAD requests
        
    if request.method == 'GET':
        try:
            all_decks = Deck.query.all()
            deck_names = [deck.name for deck in all_decks]
            print(f"GET request returning deck names: {deck_names}")
            return jsonify(deck_names)
        except Exception as e:
            print(f"Error in GET /api/decks: {str(e)}")
            return jsonify({'error': str(e)}), 500
    else:  # POST
        try:
            print(f"POST /api/decks request received")
            print(f"Content-Type: {request.headers.get('Content-Type')}")
            print(f"Request data: {request.data}")
            
            # Handle request data
            data = None
            
            # First try to get JSON from request directly
            if request.is_json:
                data = request.json
                print(f"Got JSON data: {data}")
            else:
                # Fallback: try to parse JSON from request body
                try:
                    data = json.loads(request.data)
                    print(f"Parsed JSON from request data: {data}")
                except Exception as e:
                    print(f"Could not parse JSON from request data: {str(e)}")
                    
                    # If the data couldn't be parsed, log the raw data for debugging
                    print(f"Raw request data: {request.data}")
                    
                    # As a last resort, try to get form data
                    if request.form:
                        print(f"Form data: {request.form}")
                        if 'deck' in request.form:
                            data = {'deck': request.form.get('deck')}
                            print(f"Using form data: {data}")
                        else:
                            return jsonify({'error': 'Invalid form data format'}), 400
                    else:
                        return jsonify({'error': 'Invalid JSON or Content-Type not set to application/json'}), 415
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
                
            deck_name = data.get('deck')
            print(f"Deck name from request: {deck_name}")
            
            if not deck_name:
                return jsonify({'error': 'Deck name is required'}), 400
                
            # Check if deck already exists
            existing = Deck.query.filter_by(name=deck_name).first()
            if existing:
                print(f"Deck '{deck_name}' already exists")
                return jsonify({'error': 'Deck already exists'}), 409
                
            # Create new deck
            print(f"Creating new deck: '{deck_name}'")
            new_deck = Deck(name=deck_name)
            db.session.add(new_deck)
            db.session.commit()
            print(f"Deck '{deck_name}' created successfully")
            
            # Return success response
            response = jsonify({'success': True, 'message': f'Deck "{deck_name}" created successfully'})
            print(f"Sending response: {response.data}")
            return response
        except Exception as e:
            # Roll back transaction in case of error
            db.session.rollback()
            print(f"Error creating deck: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return jsonify({'error': f'Failed to create deck: {str(e)}'}), 500

@app.route('/api/cards/<deck>', methods=['GET', 'POST'])
def cards(deck):
    # Find the deck
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        return jsonify({'error': 'Deck not found'}), 404
        
    if request.method == 'GET':
        cards = [card.to_dict() for card in deck_obj.cards]
        return jsonify(cards)
    else:
        card_data = request.json  # {front, back, frontImage, backImage, type}
        
        # Create and store new card
        new_card = Card(
            front=card_data.get('front', ''),
            back=card_data.get('back', ''),
            front_image=card_data.get('frontImage'),
            back_image=card_data.get('backImage'),
            card_type=card_data.get('type', 'Basic')
        )
        
        # Add card to deck
        deck_obj.cards.append(new_card)
        db.session.add(new_card)
        db.session.commit()
        
        return jsonify({'success': True, 'id': new_card.id})

@app.route('/api/next_card/<deck>/<user>', methods=['POST'])
def next_card(deck, user):
    print(f"@@@@@@ Request for next card - deck: {deck}, user: {user}")
    
    # Get or create user
    user_obj = User.query.filter_by(username=user).first()
    if not user_obj:
        print(f"@@@@@@ Creating new user: {user}")
        user_obj = User(username=user)
        db.session.add(user_obj)
        db.session.commit()
    
    # Get deck
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        print(f"@@@@@@ Error: Deck not found: {deck}")
        return jsonify({'success': False, 'error': f'Deck "{deck}" not found'}), 404
        
    if not deck_obj.cards or len(deck_obj.cards) == 0:
        print(f"@@@@@@ Error: No cards in deck {deck}")
        return jsonify({'success': False, 'error': f'No cards in deck "{deck}". Please add cards before studying.'}), 400
    
    print(f"@@@@@@ Found {len(deck_obj.cards)} cards in deck {deck}")
    
    # Use the scheduler to get the next card
    try:
        scheduler = Scheduler(user_obj, deck_obj.cards)
        next_card = scheduler.select_next_card()
        
        if not next_card:
            print(f"@@@@@@ Error: Scheduler returned no cards")
            return jsonify({'success': False, 'error': 'No cards available for study at this time.'}), 200
            
        print(f"@@@@@@ Selected card ID: {next_card.id}")
    except Exception as e:
        print(f"@@@@@@ Error selecting next card: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': f'Error selecting next card: {str(e)}'}), 500
    
    # Get interval prediction
    try:
        interval, _ = sample_next_review(next_card, user_obj)
        
        stats = {
            "next_interval": interval,
            "pomodoro_time": user_obj.pomodoro_length
        }
        
        # Convert card to dict to ensure all fields are serializable
        card_dict = next_card.to_dict()
        
        print(f"@@@@@@ Returning card data for card ID: {next_card.id}")
        
        # Return in the structure expected by the frontend
        return jsonify({
            "success": True,
            "next_card": {**card_dict, "stats": stats}
        })
    except Exception as e:
        print(f"@@@@@@ Error preparing card response: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': f'Error preparing card: {str(e)}'}), 500

@app.route('/api/review/<deck>/<user>', methods=['POST'])
def review_card(deck, user):
    print(f"@@@@@@ Receiving review for deck: {deck}, user: {user}")
    try:
        data = request.json
        print(f"@@@@@@ Review data: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        card_id = data.get('id')
        rating = data.get('rating')
        session_id = data.get('session_id')
        
        if card_id is None:
            return jsonify({'success': False, 'error': 'Card ID is required'}), 400
            
        if rating is None:
            return jsonify({'success': False, 'error': 'Rating is required'}), 400
            
        # Get or create user
        user_obj = User.query.filter_by(username=user).first()
        if not user_obj:
            user_obj = User(username=user)
            db.session.add(user_obj)
            db.session.commit()
        
        # Find the card
        card = Card.query.get(card_id)
        if not card:
            return jsonify({'success': False, 'error': f'Card with ID {card_id} not found'}), 404
        
        # Use active session from the user profile if not explicitly provided
        if not session_id and user_obj.active_session_id:
            session_id = user_obj.active_session_id
            print(f"@@@@@@ Using active session: {session_id}")
        
        # Add the review
        card.add_review(rating, session_id)
        user_obj.add_recall(0, rating >= 7)  # Simple success/fail based on rating
        
        # If there's an active session, track the review there as well
        session = None
        if session_id:
            session = Session.query.get(session_id)
            if session:
                print(f"@@@@@@ Adding review to session: {session.name}")
                session.add_review(card_id, rating)
            else:
                print(f"@@@@@@ Session not found: {session_id}")
        
        db.session.commit()
        
        # Get the deck object
        deck_obj = Deck.query.filter_by(name=deck).first()
        if not deck_obj:
            return jsonify({'success': False, 'error': f'Deck {deck} not found'}), 404
        
        # Get next card using scheduler
        print(f"@@@@@@ Getting next card after review")
        scheduler = Scheduler(user_obj, deck_obj.cards)
        next_card = scheduler.select_next_card()
        
        if not next_card:
            print(f"@@@@@@ No more cards available for review")
            return jsonify({
                'success': True,
                'error': 'No more cards available for review',
                'next_card': None
            })
        
        print(f"@@@@@@ Next card ID: {next_card.id}")
        
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
        print(f"@@@@@@ Error in review_card: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': f'Error processing review: {str(e)}'}), 500

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    user_name = request.args.get('user', 'default')
    deck_name = request.args.get('deck')
    
    # Get user
    user = User.query.filter_by(username=user_name).first()
    if not user:
        return jsonify([])
    
    # Get sessions
    query = Session.query.filter_by(user_id=user.id)
    
    # Filter by deck if provided
    if deck_name:
        deck = Deck.query.filter_by(name=deck_name).first()
        if deck:
            query = query.filter_by(deck_id=deck.id)
    
    # Filter out sessions that have been ended (deleted)
    query = query.filter(Session.end_time == None)
    
    sessions = query.all()
    return jsonify([session.to_dict() for session in sessions])

@app.route('/api/sessions', methods=['POST'])
def create_session():
    print("=== POST request to /api/sessions ===")
    data = request.json
    deck_name = data.get('deck')
    user_name = data.get('user', 'default')
    session_name = data.get('name')
    
    print(f"Request data: deck={deck_name}, user={user_name}, name={session_name}")
    
    if not deck_name:
        print("Error: Deck is required")
        return jsonify({'error': 'Deck is required'}), 400
    
    # Get user
    user = User.query.filter_by(username=user_name).first()
    if not user:
        print(f"Creating new user: {user_name}")
        user = User(username=user_name)
        db.session.add(user)
    else:
        print(f"Found existing user: {user_name} (id={user.id})")
    
    # Get deck
    deck = Deck.query.filter_by(name=deck_name).first()
    if not deck:
        print(f"Error: Deck not found: {deck_name}")
        return jsonify({'error': 'Deck not found'}), 404
    else:
        print(f"Found deck: {deck_name} (id={deck.id})")
        
    # Check if deck has cards
    if not deck.cards or len(deck.cards) == 0:
        print(f"Error: Deck {deck_name} has no cards")
        return jsonify({'error': 'This deck has no cards. Please add cards before studying.'}), 400
    else:
        print(f"Deck {deck_name} has {len(deck.cards)} cards")
    
    # Create session
    name = session_name or f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    print(f"Creating new session with name: {name}")
    session = Session(name=name, user_id=user.id, deck_id=deck.id)
    
    try:
        # Add session to database first
        db.session.add(session)
        db.session.commit()
        print(f"Created session successfully with ID: {session.id}")
        
        # Link session to user AFTER committing to ensure session.id is valid
        print(f"Linking session {session.id} to user {user.username}")
        user.start_session(session.id)
        db.session.commit()
        print(f"Successfully linked session to user")
        
        session_dict = session.to_dict()
        print(f"Session data: {session_dict}")
        
        return jsonify({
            'success': True,
            'session': session_dict
        })
    except Exception as e:
        print(f"Error creating session: {str(e)}")
        import traceback
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Error creating session: {str(e)}'}), 500

@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    session = Session.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    return jsonify(session.to_dict())

@app.route('/api/sessions/<session_id>/end', methods=['POST'])
def end_session(session_id):
    session = Session.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
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

@app.route('/api/stats/<stat_type>', methods=['GET'])
def get_stats(stat_type):
    user_name = request.args.get('user', 'default')
    deck_name = request.args.get('deck')
    session_id = request.args.get('session')
    
    # Get user
    user = User.query.filter_by(username=user_name).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Set global style for plots with dark background and light text
    plt.style.use('dark_background')
    plt.rcParams['figure.dpi'] = 100
    plt.rcParams['text.color'] = 'white'
    plt.rcParams['axes.labelcolor'] = 'white'
    plt.rcParams['axes.edgecolor'] = 'white'
    plt.rcParams['axes.facecolor'] = '#2f2f31'
    plt.rcParams['axes.titlecolor'] = 'white'
    plt.rcParams['xtick.color'] = 'white'
    plt.rcParams['ytick.color'] = 'white'
    
    # Create figure with two subplots side by side
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8, 4))
    fig.set_facecolor('#2f2f31')
    
    title_prefix = ""
    if stat_type == "user":
        title_prefix = f"User: {user_name}"
        data = user.get_recall_history()
    elif stat_type == "deck" and deck_name:
        title_prefix = f"Deck: {deck_name}"
        # Get the deck
        deck = Deck.query.filter_by(name=deck_name).first()
        if not deck:
            return jsonify({'error': 'Deck not found'}), 404
            
        # Get all reviews for cards in this deck
        data = []
        for card in deck.cards:
            for review in card.reviews:
                data.append((0, 1 if review.rating >= 7 else 0))
    elif stat_type == "session" and session_id:
        # Get the session
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        title_prefix = f"Session: {session.name}"
        data = [(0, 1 if review.rating >= 7 else 0) for review in session.reviews]
    else:
        return jsonify({'error': 'Invalid stat type or missing parameters'}), 400
    
    # Plot 1: Success rate - more compact with minimal elements
    if data:
        review_indices = list(range(1, len(data) + 1))
        cumulative_success = [sum(1 for _, s in data[:i+1] if s == 1) / (i+1) for i in range(len(data))]
        
        ax1.plot(review_indices, cumulative_success, '-', linewidth=2, color='#2496dc', label='Success')
        ax1.axhline(y=0.7, color='r', linestyle='--', linewidth=1, label='Target')
        ax1.set_xlabel('Review #', fontsize=9, color='white')
        ax1.set_ylabel('Rate', fontsize=9, color='white')
        ax1.set_title('Success Rate', fontsize=11, color='white', fontweight='bold')
        ax1.legend(fontsize=8, loc='lower right')
        ax1.grid(True, alpha=0.2)
        ax1.tick_params(axis='both', which='major', labelsize=8, colors='white')
        # Set y-axis limits to prevent extra white space
        ax1.set_ylim(0, 1.05)
        # Only show certain x ticks to avoid crowding
        if len(review_indices) > 10:
            step = len(review_indices) // 5
            ax1.set_xticks(review_indices[::step])
    
    # Plot 2: Performance distribution - more compact with minimal elements
    if data:
        successes = sum(s for _, s in data)
        failures = len(data) - successes
        alpha = 2 + successes  # Adding prior
        beta = 1 + failures    # Adding prior
        
        xs = np.linspace(0, 1, 100)  # Reduced number of points
        ys = [scipy.stats.beta.pdf(x, alpha, beta) for x in xs]
        
        ax2.plot(xs, ys, linewidth=1.5, color='#2496dc', label=f'α={alpha:.1f}, β={beta:.1f}')
        ax2.axvline(x=alpha/(alpha+beta), color='r', linestyle='--', linewidth=1, label='Mean')
        ax2.set_xlabel('Success Rate', fontsize=9, color='white')
        ax2.set_ylabel('Density', fontsize=9, color='white')
        ax2.set_title('Performance', fontsize=11, color='white', fontweight='bold')
        # Move legend outside the plot to save space
        ax2.legend(fontsize=8, loc='upper right')
        ax2.grid(True, alpha=0.2)
        ax2.tick_params(axis='both', which='major', labelsize=8, colors='white')
    
    # Remove excess whitespace around plots
    plt.tight_layout(pad=1.0)
    
    # Save plot to bytes - using the dark background color and higher quality
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='#2f2f31', dpi=120)
    plt.close(fig)  # Close the figure to free up memory
    buf.seek(0)
    return send_file(buf, mimetype='image/png')

@app.route('/api/cards/<deck>/<card_id>', methods=['DELETE'])
def delete_card(deck, card_id):
    # Find the deck
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        return jsonify({'error': 'Deck not found'}), 404
        
    # Find the card
    card = Card.query.get(card_id)
    if not card:
        return jsonify({'error': 'Card not found'}), 404
        
    # Remove card from deck
    try:
        # Remove from deck relationship
        deck_obj.cards.remove(card)
        # Delete any reviews associated with this card
        Review.query.filter_by(card_id=card.id).delete()
        # Delete the card itself
        db.session.delete(card)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting card: {str(e)}")
        return jsonify({'error': f'Failed to delete card: {str(e)}'}), 500

@app.route('/api/cards/<deck>/<card_id>', methods=['PUT'])
def update_card(deck, card_id):
    # Find the deck
    deck_obj = Deck.query.filter_by(name=deck).first()
    if not deck_obj:
        return jsonify({'error': 'Deck not found'}), 404
        
    # Find the card
    card = Card.query.get(card_id)
    if not card:
        return jsonify({'error': 'Card not found'}), 404
        
    # Update card with new data
    try:
        data = request.json
        if 'front' in data:
            card.front = data['front']
        if 'back' in data:
            card.back = data['back']
        if 'frontImage' in data:
            card.front_image = data['frontImage']
        if 'backImage' in data:
            card.back_image = data['backImage']
        if 'type' in data:
            card.card_type = data['type']
            
        db.session.commit()
        return jsonify({'success': True, 'card': card.to_dict()})
    except Exception as e:
        db.session.rollback()
        print(f"Error updating card: {str(e)}")
        return jsonify({'error': f'Failed to update card: {str(e)}'}), 500

# ------------------- DIAGNOSTIC ENDPOINTS -------------------

@app.route('/api/diagnostic/deck/<deck>', methods=['GET'])
def diagnostic_deck(deck):
    try:
        # Get deck
        deck_obj = Deck.query.filter_by(name=deck).first()
        if not deck_obj:
            return jsonify({
                "error": f"Deck '{deck}' not found",
                "available_decks": [d.name for d in Deck.query.all()]
            }), 404
            
        # Get cards
        cards = deck_obj.cards
        
        return jsonify({
            "success": True,
            "deck_info": {
                "id": deck_obj.id,
                "name": deck_obj.name,
                "date_created": deck_obj.date_created.isoformat(),
                "card_count": len(cards),
                "cards": [{
                    "id": card.id,
                    "front": card.front,
                    "back": card.back,
                    "front_image": card.front_image,
                    "back_image": card.back_image,
                    "card_type": card.card_type,
                    "date_added": card.date_added.isoformat(),
                    "review_count": len(card.reviews),
                    "is_mature": card.is_mature,
                    "mature_streak": card.mature_streak,
                    "last_wrong": card.last_wrong.isoformat() if card.last_wrong else None,
                    "last_review": (max((r.timestamp for r in card.reviews), default=None).isoformat() if card.reviews else None)
                } for card in cards]
            }
        })
    except Exception as e:
        print(f"Error in diagnostic endpoint: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/diagnostic/session/<user>', methods=['GET'])
def diagnostic_session(user):
    try:
        # Get user
        user_obj = User.query.filter_by(username=user).first()
        if not user_obj:
            return jsonify({
                "error": f"User '{user}' not found",
                "available_users": [u.username for u in User.query.all()]
            }), 404
            
        # Get active session if any
        active_session = None
        if user_obj.active_session_id:
            active_session = Session.query.get(user_obj.active_session_id)
        
        return jsonify({
            "success": True,
            "user_info": {
                "id": user_obj.id,
                "username": user_obj.username,
                "global_decay": user_obj.global_decay,
                "pomodoro_length": user_obj.pomodoro_length,
                "active_session_id": user_obj.active_session_id,
                "active_session": {
                    "id": active_session.id,
                    "name": active_session.name,
                    "start_time": active_session.start_time.isoformat(),
                    "end_time": active_session.end_time.isoformat() if active_session.end_time else None,
                    "review_count": len(active_session.reviews)
                } if active_session else None,
                "recall_history": user_obj.get_recall_history()
            }
        })
    except Exception as e:
        print(f"Error in diagnostic endpoint: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/diagnostic/db', methods=['GET'])
def diagnostic_db():
    try:
        return jsonify({
            "success": True,
            "database_info": {
                "decks": [{
                    "id": deck.id,
                    "name": deck.name,
                    "card_count": len(deck.cards)
                } for deck in Deck.query.all()],
                "users": [{
                    "id": user.id,
                    "username": user.username,
                    "active_session_id": user.active_session_id
                } for user in User.query.all()],
                "sessions": [{
                    "id": session.id,
                    "name": session.name,
                    "user": session.user_profile.username,
                    "deck": session.deck_info.name,
                    "review_count": len(session.reviews)
                } for session in Session.query.all()]
            }
        })
    except Exception as e:
        print(f"Error in diagnostic endpoint: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# ------------------- DB INITIALIZATION -------------------

# Note: We've removed db.create_all() to let migrations handle the database schema

if __name__ == '__main__':
    app.run(port=5002, debug=True)  # Changed port from 5001 to 5002
