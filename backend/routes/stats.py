# /api/stats endpoints

from flask import Blueprint, request, jsonify, send_file
from models import User, Deck, Session, Review
import numpy as np
import scipy.stats
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import datetime

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/api/stats/<stat_type>', methods=['GET'])
def get_stats(stat_type):
    user_name = request.args.get('user', 'default')
    deck_name = request.args.get('deck')
    session_id = request.args.get('session')
    timestamp = request.args.get('t')  # Get the timestamp parameter
    
    print(f"[STATS DEBUG] Request received for {stat_type}, user: {user_name}, timestamp: {timestamp}")
    
    user = User.query.filter_by(username=user_name).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Debug: Log current user settings
    prior_alpha = getattr(user, 'prior_alpha', 2)
    prior_beta = getattr(user, 'prior_beta', 1)
    print(f"[STATS DEBUG] User {user_name} settings: prior_alpha={prior_alpha}, prior_beta={prior_beta}")
    print(f"[STATS DEBUG] Prior expected rate: {prior_alpha / (prior_alpha + prior_beta):.3f}")
    
    data = []
    if stat_type == "user":
        data = user.get_recall_history()
        print(f"[STATS DEBUG] get_recall_history() returned: {len(data) if data else 0} items")
        if not data:
            all_user_reviews = Review.query.join(Session).filter(Session.user_id == user.id).all()
            print(f"[STATS DEBUG] Found {len(all_user_reviews)} reviews via direct query")
            if all_user_reviews:
                data = [(0, 1 if review.rating >= 3 else 0) for review in all_user_reviews]
                print(f"[STATS DEBUG] Converted to data: {data}")
        if not data:
            data = []
        print(f"[STATS DEBUG] Final data length: {len(data)}")
    elif stat_type == "deck" and deck_name:
        deck = Deck.query.filter_by(name=deck_name).first()
        if not deck:
            return jsonify({'error': 'Deck not found'}), 404
        reviews = []
        for card in deck.cards:
            card_reviews = Review.query.filter_by(card_id=card.id).all()
            reviews.extend(card_reviews)
        if reviews:
            data = [(0, 1 if review.rating >= 3 else 0) for review in reviews]
        if not data:
            data = []
    elif stat_type == "session" and session_id:
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        data = [(0, 1 if review.rating >= 3 else 0) for review in session.reviews]
        if not data:
            data = []
    else:
        return jsonify({'error': 'Invalid stat type or missing parameters'}), 400
    plt.clf()
    plt.close('all')
    matplotlib.rcdefaults()
    plt.style.use('dark_background')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8, 4), facecolor='#2f2f31')
    fig.patch.set_facecolor('#2f2f31')
    ax1.set_facecolor('#2f2f31')
    ax2.set_facecolor('#2f2f31')
    if stat_type == "user":
        title_prefix = f"User: {user_name}"
    elif stat_type == "deck":
        title_prefix = f"Deck: {deck_name}"
    elif stat_type == "session":
        session = Session.query.get(session_id)
        title_prefix = f"Session: {session.name}"
    
    # Add timestamp to verify new plots are being generated
    import time
    plot_timestamp = int(time.time() * 1000) % 10000  # Last 4 digits of timestamp
    print(f"[STATS DEBUG] Generating plot with timestamp: {plot_timestamp}")
    if data:
        review_indices = list(range(1, len(data) + 1))
        cumulative_success = [sum(1 for _, s in data[:i+1] if s == 1) / (i+1) for i in range(len(data))]
        if all(rate == 0 for rate in cumulative_success):
            ax1.plot(review_indices, cumulative_success, '-', linewidth=2, color='#ff6b6b', label='Success Rate')
            ax1.text(0.5, 0.5, 'All reviews marked as failures\n(Rating < 3)\nTry using higher ratings!',
                    ha='center', va='center', transform=ax1.transAxes,
                    fontsize=10, color='yellow',
                    bbox=dict(boxstyle="round,pad=0.3", facecolor='red', alpha=0.4))
        else:
            ax1.plot(review_indices, cumulative_success, '-', linewidth=2, color='#2496dc', label='Success Rate')
        ax1.axhline(y=0.7, color='r', linestyle='--', linewidth=1, label='Target (70%)')
        ax1.set_xlabel('Review #', fontsize=9, color='white')
        ax1.set_ylabel('Success Rate', fontsize=9, color='white')
        ax1.set_title(f'Success Rate Over Time #{plot_timestamp}', fontsize=11, color='white', fontweight='bold')
        ax1.legend(fontsize=8, loc='lower right')
        ax1.grid(True, alpha=0.2)
        ax1.tick_params(axis='both', which='major', labelsize=8, colors='white')
        ax1.set_ylim(0, 1.05)
        if len(review_indices) > 10:
            step = max(1, len(review_indices) // 10)
            ax1.set_xticks(review_indices[::step])
    else:
        target_rate = 0.7
        alpha = getattr(user, 'prior_alpha', 2)
        beta = getattr(user, 'prior_beta', 1)
        prior_expected = alpha / (alpha + beta) if (alpha + beta) != 0 else 0.5
        ax1.axhline(y=target_rate, color='r', linestyle='--', linewidth=1, label='Target (70%)')
        ax1.axhline(y=prior_expected, color='#2496dc', linestyle='-', linewidth=2, label=f'Prior Expected ({prior_expected:.1%})')
        ax1.set_xlabel('Review #', fontsize=9, color='white')
        ax1.set_ylabel('Success Rate', fontsize=9, color='white')
        ax1.set_title(f'Expected Success Rate #{plot_timestamp}', fontsize=11, color='white', fontweight='bold')
        ax1.legend(fontsize=8, loc='lower right')
        ax1.grid(True, alpha=0.2)
        ax1.tick_params(axis='both', which='major', labelsize=8, colors='white')
        ax1.set_ylim(0, 1.05)
        ax1.set_xlim(0, 10)
        ax1.text(0.02, 0.95, 'No review data yet.\nShowing expected rates\nbased on Bayesian priors.',
                ha='left', va='top', transform=ax1.transAxes,
                fontsize=9, color='yellow', alpha=0.8)
    if data:
        successes = sum(s for _, s in data)
        failures = len(data) - successes
        user_alpha = getattr(user, 'prior_alpha', 2)
        user_beta = getattr(user, 'prior_beta', 1)
        alpha = user_alpha + successes
        beta = user_beta + failures
        print(f"[STATS DEBUG] Generating plot with DATA - user_alpha={user_alpha}, user_beta={user_beta}, successes={successes}, failures={failures}, final_alpha={alpha}, final_beta={beta}")
        xs = np.linspace(0, 1, 100)
        ys = [scipy.stats.beta.pdf(x, alpha, beta) for x in xs]
        ax2.plot(xs, ys, linewidth=1.5, color='#2496dc', label=f'α={alpha:.1f}, β={beta:.1f}')
        ax2.axvline(x=alpha/(alpha+beta), color='r', linestyle='--', linewidth=1, label='Mean')
        ax2.set_xlabel('Success Rate', fontsize=9, color='white')
        ax2.set_ylabel('Density', fontsize=9, color='white')
        ax2.set_title(f'Performance #{plot_timestamp}', fontsize=11, color='white', fontweight='bold')
        ax2.legend(fontsize=8, loc='upper right')
        ax2.grid(True, alpha=0.2)
        ax2.tick_params(axis='both', which='major', labelsize=8, colors='white')
    else:
        alpha = getattr(user, 'prior_alpha', 2)
        beta = getattr(user, 'prior_beta', 1)
        print(f"[STATS DEBUG] Generating plot with NO DATA - alpha={alpha}, beta={beta}")
        xs = np.linspace(0, 1, 100)
        ys = [scipy.stats.beta.pdf(x, alpha, beta) for x in xs]
        ax2.plot(xs, ys, linewidth=1.5, color='#2496dc', label=f'Prior: α={alpha}, β={beta}')
        ax2.axvline(x=alpha/(alpha+beta), color='r', linestyle='--', linewidth=1, label='Mean')
        ax2.set_xlabel('Success Rate', fontsize=9, color='white')
        ax2.set_ylabel('Density', fontsize=9, color='white')
        ax2.set_title(f'Bayesian Prior Belief #{plot_timestamp}', fontsize=11, color='white', fontweight='bold')
        ax2.legend(fontsize=8, loc='upper right')
        ax2.grid(True, alpha=0.2)
        ax2.tick_params(axis='both', which='major', labelsize=8, colors='white')
        ax2.text(0.02, 0.95, 'No review data yet.\nShowing initial\nBayesian prior belief.',
                ha='left', va='top', transform=ax2.transAxes,
                fontsize=9, color='yellow', alpha=0.8)
    plt.tight_layout(pad=1.0)
    buf = BytesIO()
    try:
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor='#2f2f31', dpi=120)
        buf.seek(0)
        print(f"[STATS DEBUG] Successfully generated plot with timestamp {plot_timestamp}, buffer size: {len(buf.getvalue())} bytes")
        return send_file(buf, mimetype='image/png')
    except Exception as e:
        print(f"[STATS DEBUG] Error generating plot: {e}")
        return jsonify({'error': 'Failed to generate statistics plot', 'details': str(e)}), 500
    finally:
        plt.close(fig)
        plt.close('all')
