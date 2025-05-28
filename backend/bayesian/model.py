import numpy as np
import math

def bayesian_posterior(card, user_profile, prior_alpha=None, prior_beta=None):
    """Compute the posterior alpha and beta for a card and user."""
    if prior_alpha is None:
        prior_alpha = user_profile.prior_alpha
    if prior_beta is None:
        prior_beta = user_profile.prior_beta
    ratings = card.get_ratings()
    if not ratings:
        return prior_alpha, prior_beta
    success = sum(r >= 7 for r in ratings)
    fail = sum(r < 7 for r in ratings)
    return prior_alpha + success, prior_beta + fail

def adaptive_decay(card, user_profile, base_decay=None, history_window=None):
    """Compute adaptive decay for a card and user."""
    reviews = card.reviews
    if base_decay is None:
        base_decay = user_profile.global_decay
    if history_window is None:
        history_window = user_profile.history_window
    if len(reviews) < 2:
        return base_decay
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
    if card.mature_streak > 3:
        decay *= 0.6
    return max(0.001, decay)

def sample_next_review(card, user_profile, target_recall=None, n_samples=None):
    """Sample the next review interval for a card and user."""
    try:
        if target_recall is None:
            target_recall = user_profile.target_recall
        if n_samples is None:
            n_samples = user_profile.n_samples
        easy_mode = getattr(user_profile, 'easy_mode', False)
        from .model import bayesian_posterior, adaptive_decay
        alpha, beta = bayesian_posterior(card, user_profile)
        decay = adaptive_decay(card, user_profile)
        if easy_mode:
            target_recall = min(0.8, target_recall + 0.1)
            decay = decay * 1.2
        p0_samples = np.random.beta(alpha, beta, n_samples)
        t_samples = []
        for p0 in p0_samples:
            if p0 <= target_recall:
                t_samples.append(1)
            else:
                t = -np.log(target_recall / p0) / decay
                t_samples.append(max(1, int(t)))
        try:
            mature_streak = getattr(card, 'mature_streak', 0)
            time_since = 0
            try:
                if hasattr(card, 'time_since_added') and callable(card.time_since_added):
                    time_since = card.time_since_added()
                else:
                    time_since = 0
            except Exception:
                time_since = 0
            age_factor = 1 + (mature_streak // 2) + (time_since / (60 * 24 * 7))
            if easy_mode:
                age_factor = min(age_factor, 1.5)
            t_samples = [t * age_factor for t in t_samples]
        except Exception as e:
            print(f"Error calculating age factor: {str(e)}")
        if easy_mode:
            percentile = np.random.uniform(30, 70)
        else:
            percentile = np.random.uniform(50, 90)
        interval = int(np.percentile(t_samples, percentile))
        return interval, t_samples
    except Exception as e:
        print(f"Error in sample_next_review: {str(e)}")
        return 1, [1] * (n_samples or 1000)

def get_recent_posterior(user_profile, window=30, prior_alpha=2, prior_beta=1):
    """Get recent posterior for a user profile."""
    recent = user_profile.get_recall_history()[-window:]
    successes = sum(s for _, s in recent)
    failures = len(recent) - successes
    alpha = prior_alpha + successes
    beta = prior_beta + failures
    return alpha, beta

def sample_success_rate(alpha, beta, n_samples=1000):
    """Sample success rate from beta distribution."""
    return np.random.beta(alpha, beta, n_samples)

def bayesian_success_rate_interval(interval, alpha, beta, target=0.8, sensitivity=0.2):
    """Adjust interval based on Bayesian success rate."""
    p_samples = np.random.beta(alpha, beta, 1000)
    mean_p = np.mean(p_samples)
    correction = 1 + sensitivity * (mean_p - target)
    return int(max(1, interval * correction))
