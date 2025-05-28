import os
import sys

def get_database_path():
    """Get the appropriate database path for the current environment."""
    if getattr(sys, 'frozen', False):
        bundle_dir = os.path.dirname(sys.executable)
        app_data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'Bayesian Flashcards')
        os.makedirs(app_data_dir, exist_ok=True)
        db_path = os.path.join(app_data_dir, 'flashcards.db')
        return 'sqlite:///' + db_path
    else:
        return os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'flashcards.db'))
