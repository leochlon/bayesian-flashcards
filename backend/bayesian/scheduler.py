import random


class Scheduler:
    """Scheduler for selecting the next card to review."""

    def __init__(self, user_profile, cards):
        self.user_profile = user_profile
        self.cards = cards
        self.card_review_counts = {card.id: 0 for card in self.cards}

    def select_next_card(self, backlog_limit=None, max_reviews_per_card=None):
        if backlog_limit is None:
            backlog_limit = self.user_profile.backlog_limit
        if max_reviews_per_card is None:
            max_reviews_per_card = self.user_profile.max_reviews_per_card
        urgents = []
        news = []
        matures = []
        for c in self.cards:
            try:
                if self.card_review_counts[c.id] >= max_reviews_per_card:
                    continue
                if not c.reviews:
                    news.append(c)
                elif c.is_urgent():
                    urgents.append(c)
                else:
                    matures.append(c)
            except Exception as e:
                print(f"Error categorizing card {c.id}: {str(e)}")
                news.append(c)
        random.shuffle(urgents)
        random.shuffle(news)
        random.shuffle(matures)
        to_study = (
            urgents[:backlog_limit]
            + news[: self.user_profile.new_cards_per_session]
            + matures[: self.user_profile.mature_cards_per_session]
        )
        if len(to_study) > backlog_limit:
            to_study = to_study[:backlog_limit]
        if to_study:
            card = random.choice(to_study)
            self.card_review_counts[card.id] += 1
            return card
        else:
            remaining = [
                c for c in self.cards if self.card_review_counts[c.id] < max_reviews_per_card
            ]
            if remaining:
                card = random.choice(remaining)
                self.card_review_counts[card.id] += 1
                return card
            return random.choice(self.cards) if self.cards else None
