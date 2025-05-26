#!/usr/bin/env python3
"""
Database initialization script for Bayesian Flashcards
Creates the SQLite database and all required tables
"""

import os
import sys
import sqlite3
from datetime import datetime

def init_database():
    """Initialize the database with all tables and default data"""
    try:
        # Get database path from environment or use default
        db_url = os.environ.get('DATABASE_URL')
        
        # Set default path if not provided in environment
        if not db_url:
            # Use a path in the user's Application Support directory
            app_data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'Bayesian Flashcards')
            os.makedirs(app_data_dir, exist_ok=True)
            db_path = os.path.join(app_data_dir, 'flashcards.db')
            db_url = f'sqlite:///{db_path}'
        
        # Extract file path from SQLite URL
        if db_url.startswith('sqlite:///'):
            db_path = db_url[10:]  # Remove 'sqlite:///' prefix
        else:
            db_path = 'flashcards.db'
        
        print(f"Initializing database at: {db_path}")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else '.', exist_ok=True)
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create tables
        print("Creating database tables...")
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(80) UNIQUE NOT NULL,
                recall_history TEXT DEFAULT '[]',
                global_decay FLOAT DEFAULT 0.03,
                pomodoro_length INTEGER DEFAULT 25,
                break_length INTEGER DEFAULT 5,
                session_fatigue INTEGER DEFAULT 0,
                focus_drop_count INTEGER DEFAULT 0,
                active_session_id VARCHAR(36)
            )
        ''')
        
        # Decks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deck (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) UNIQUE NOT NULL,
                date_created DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Cards table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS card (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                front_image TEXT,
                back_image TEXT,
                card_type VARCHAR(50) DEFAULT 'Basic',
                date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
                mature_streak INTEGER DEFAULT 0,
                last_wrong DATETIME,
                is_mature BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS session (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                user_id INTEGER NOT NULL,
                deck_id INTEGER NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                FOREIGN KEY (user_id) REFERENCES user (id),
                FOREIGN KEY (deck_id) REFERENCES deck (id)
            )
        ''')
        
        # Reviews table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS review (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                session_id VARCHAR(36),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                rating INTEGER NOT NULL,
                FOREIGN KEY (card_id) REFERENCES card (id),
                FOREIGN KEY (session_id) REFERENCES session (id)
            )
        ''')
        
        # Deck-Cards association table (many-to-many)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deck_cards (
                deck_id INTEGER NOT NULL,
                card_id INTEGER NOT NULL,
                PRIMARY KEY (deck_id, card_id),
                FOREIGN KEY (deck_id) REFERENCES deck (id),
                FOREIGN KEY (card_id) REFERENCES card (id)
            )
        ''')
        
        print("✓ Database tables created successfully")
        
        # Create default user if not exists
        cursor.execute('SELECT COUNT(*) FROM user WHERE username = ?', ('default',))
        user_exists = cursor.fetchone()[0] > 0
        
        if not user_exists:
            print("Creating default user...")
            cursor.execute(
                'INSERT INTO user (username, global_decay) VALUES (?, ?)',
                ('default', 0.03)
            )
            print("✓ Default user created successfully")
        else:
            print("! Default user already exists")
        
        # Commit changes
        conn.commit()
        conn.close()
        
        print("✓ Database initialization completed successfully")
        return True
        
    except Exception as e:
        print(f"✗ Database initialization failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Initializing Bayesian Flashcards database...")
    
    # Check if database file path is provided via environment variable
    db_path = os.environ.get('DATABASE_URL')
    if db_path:
        print(f"Using database path from environment: {db_path}")
    else:
        print("Using default database configuration")
    
    success = init_database()
    sys.exit(0 if success else 1)