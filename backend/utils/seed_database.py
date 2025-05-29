"""
A utility module to seed the database with initial data.
This will check if there's a seed database in the seed_data directory
and use it to initialize the application database if present.
"""
import os
import sys
import shutil
import sqlite3

def seed_database_if_needed():
    """
    Copy the seed database to the application data directory if:
    1. The seed database exists
    2. The destination database doesn't exist or is empty
    
    Returns True if seeding was performed, False otherwise.
    """
    try:
        # Determine paths based on environment
        if getattr(sys, 'frozen', False):
            # Running in a bundle
            bundle_dir = os.path.dirname(sys.executable)
            app_dir = os.path.dirname(bundle_dir)
            seed_db_path = os.path.join(app_dir, 'backend', 'seed_data', 'flashcards.db')
            
            # App data directory depends on OS
            if sys.platform == 'darwin':  # macOS
                app_data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'Bayesian Flashcards')
            elif sys.platform == 'win32':  # Windows
                app_data_dir = os.path.join(os.environ['APPDATA'], 'Bayesian Flashcards')
            else:  # Linux and others
                app_data_dir = os.path.join(os.path.expanduser('~'), '.bayesianflashcards')
            
            os.makedirs(app_data_dir, exist_ok=True)
            dest_db_path = os.path.join(app_data_dir, 'flashcards.db')
        else:
            # Development mode
            base_dir = os.path.abspath(os.path.dirname(__file__))
            seed_db_path = os.path.join(base_dir, 'seed_data', 'flashcards.db')
            dest_db_path = os.path.join(base_dir, 'flashcards.db')
        
        # Check if seed database exists
        if not os.path.exists(seed_db_path):
            print(f"No seed database found at {seed_db_path}")
            return False
        
        # Check if destination database already exists and has content
        if os.path.exists(dest_db_path):
            # Check if it has any decks
            try:
                conn = sqlite3.connect(dest_db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='deck'")
                has_deck_table = cursor.fetchone()[0] > 0
                
                if has_deck_table:
                    cursor.execute("SELECT COUNT(*) FROM deck")
                    deck_count = cursor.fetchone()[0]
                    if deck_count > 0:
                        print(f"Destination database already has {deck_count} decks. Skipping seeding.")
                        conn.close()
                        return False
                
                conn.close()
            except sqlite3.Error as e:
                print(f"Error checking destination database: {e}")
                # If we can't check the database, assume it's invalid and overwrite it
        
        # Copy seed database to destination
        print(f"Seeding database from {seed_db_path} to {dest_db_path}")
        shutil.copy2(seed_db_path, dest_db_path)
        print("Database seeded successfully")
        return True
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        return False

if __name__ == "__main__":
    # Can be used as a standalone script for testing
    seed_database_if_needed()
