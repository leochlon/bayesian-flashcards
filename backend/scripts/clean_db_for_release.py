#!/usr/bin/env python3
"""
Clean up the database for public release by removing all user sessions and reviews.
Preserves deck and card information.
"""
import os
import sqlite3
import shutil
from datetime import datetime

# Path constants
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'flashcards.db')
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')

# Print paths for debugging
print(f"Script location: {__file__}")
print(f"Database path: {DB_PATH}")
print(f"Backup directory: {BACKUP_DIR}")

def create_backup():
    """Create a backup of the database before cleaning."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(BACKUP_DIR, f'flashcards_{timestamp}.db')
    shutil.copy2(DB_PATH, backup_path)
    print(f"Backup created at: {backup_path}")
    return backup_path

def clean_database():
    """Clean the database for public release."""
    print("Connecting to database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get record counts before cleaning
    tables = ['user', 'deck', 'card', 'deck_cards', 'session', 'review']
    print("\nRecord counts before cleaning:")
    before_counts = {}
    for table in tables:
        count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        before_counts[table] = count
        print(f"- {table}: {count} records")
    
    # Perform cleanup
    print("\nPerforming cleanup...")
    
    # Create a default user if it doesn't exist
    cursor.execute("DELETE FROM user") # Remove all users
    cursor.execute("""
        INSERT INTO user (
            username, recall_history, global_decay, pomodoro_length, break_length, 
            prior_alpha, prior_beta, target_recall, n_samples, history_window, 
            backlog_limit, max_reviews_per_card, new_cards_per_session, 
            mature_cards_per_session, easy_mode
        )
        VALUES (
            'default_user', '[]', 0.03, 25, 5, 
            1.0, 1.0, 0.8, 3000, 5, 
            50, 2, 5, 
            10, 0
        )
    """)
    
    # Clear all sessions and reviews
    cursor.execute("DELETE FROM session")
    cursor.execute("DELETE FROM review")
    
    # Reset any card statistics
    cursor.execute("""
        UPDATE card SET 
        mature_streak = 0,
        last_wrong = NULL,
        is_mature = 0
    """)
    
    # Commit changes
    conn.commit()
    
    # Get record counts after cleaning
    print("\nRecord counts after cleaning:")
    for table in tables:
        count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"- {table}: {count} records ({before_counts[table] - count} removed)")
    
    # Vacuum the database to reclaim unused space
    print("\nOptimizing database size...")
    conn.execute("VACUUM")
    
    # Close the connection
    conn.close()
    print("\nDatabase cleanup completed successfully.")

if __name__ == "__main__":
    print("Starting database cleanup for public release...")
    backup_path = create_backup()
    clean_database()
    print(f"\nBackup is available at: {backup_path}")
    print("Database is now ready for public release.")
