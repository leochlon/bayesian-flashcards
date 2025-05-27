#!/usr/bin/env python3

"""
Backend Debug Script for Bayesian Flashcards
Tests the Flask backend functionality and database connectivity.
"""

import os
import sys
import requests
import json
import sqlite3
from pathlib import Path
import subprocess

def colored_print(text, color_code):
    """Print colored text for better visibility"""
    colors = {
        'red': '\033[0;31m',
        'green': '\033[0;32m',
        'yellow': '\033[1;33m',
        'blue': '\033[0;34m',
        'reset': '\033[0m'
    }
    print(f"{colors.get(color_code, '')}{text}{colors['reset']}")

def check_backend_process():
    """Check if backend process is running"""
    colored_print("1. Checking backend process...", 'yellow')
    
    try:
        result = subprocess.run(['pgrep', '-f', 'python.*app.py'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            colored_print("✓ Backend process is running", 'green')
            print(f"PID: {result.stdout.strip()}")
            return True
        else:
            colored_print("✗ Backend process not found", 'red')
            return False
    except Exception as e:
        colored_print(f"Error checking process: {e}", 'red')
        return False

def test_backend_health():
    """Test backend health endpoint"""
    colored_print("2. Testing backend health...", 'yellow')
    
    try:
        response = requests.get('http://localhost:5002/api/health', timeout=5)
        if response.status_code == 200:
            colored_print("✓ Health endpoint responding", 'green')
            print(f"Response: {response.json()}")
            return True
        else:
            colored_print(f"✗ Health endpoint returned {response.status_code}", 'red')
            return False
    except requests.exceptions.ConnectionError:
        colored_print("✗ Cannot connect to backend (connection refused)", 'red')
        return False
    except requests.exceptions.Timeout:
        colored_print("✗ Backend health check timed out", 'red')
        return False
    except Exception as e:
        colored_print(f"✗ Health check error: {e}", 'red')
        return False

def check_database():
    """Check database file and basic connectivity"""
    colored_print("3. Checking database...", 'yellow')
    
    # Check database file
    app_data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'Bayesian Flashcards')
    backend_db = Path(os.path.join(app_data_dir, 'flashcards.db'))
    dev_db = Path('backend/flashcards.db')
    
    if backend_db.exists():
        colored_print(f"✓ Database file exists at {backend_db}", 'green')
        print(f"Size: {backend_db.stat().st_size} bytes")
        db_to_check = backend_db
    elif dev_db.exists():
        colored_print(f"✓ Development database file exists at {dev_db}", 'green')
        print(f"Size: {dev_db.stat().st_size} bytes")
        db_to_check = dev_db
    else:
        colored_print("✗ Database file missing", 'red')
        return False
    
    try:
        conn = sqlite3.connect(str(db_to_check))
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        colored_print(f"✓ Database tables: {[t[0] for t in tables]}", 'green')
        
        # Check basic data
        cursor.execute("SELECT COUNT(*) FROM deck;")
        deck_count = cursor.fetchone()[0]
        print(f"Decks in database: {deck_count}")
        
        cursor.execute("SELECT COUNT(*) FROM card;")
        card_count = cursor.fetchone()[0]
        print(f"Cards in database: {card_count}")
        
        conn.close()
        return True
            
    except Exception as e:
        colored_print(f"✗ Database connection error: {e}", 'red')
        return False

def test_api_endpoints():
    """Test key API endpoints"""
    colored_print("4. Testing API endpoints...", 'yellow')
    
    base_url = 'http://localhost:5002/api'
    endpoints_to_test = [
        ('/decks', 'GET'),
        ('/health', 'GET'),
    ]
    
    for endpoint, method in endpoints_to_test:
        try:
            if method == 'GET':
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
            
            if response.status_code == 200:
                colored_print(f"✓ {method} {endpoint} - OK", 'green')
                if endpoint == '/decks':
                    print(f"   Decks: {response.json()}")
            else:
                colored_print(f"✗ {method} {endpoint} - {response.status_code}", 'red')
                
        except Exception as e:
            colored_print(f"✗ {method} {endpoint} - Error: {e}", 'red')

def check_python_environment():
    """Check Python environment and dependencies"""
    colored_print("5. Checking Python environment...", 'yellow')
    
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    
    # Check required packages
    required_packages = [
        'flask', 'flask_cors', 'flask_migrate', 'sqlalchemy', 
        'requests', 'numpy', 'matplotlib', 'scipy'
    ]
    
    for package in required_packages:
        try:
            __import__(package)
            colored_print(f"✓ {package} installed", 'green')
        except ImportError:
            colored_print(f"✗ {package} missing", 'red')

def start_backend_if_needed():
    """Attempt to start backend if not running"""
    colored_print("6. Attempting to start backend...", 'yellow')
    
    if not check_backend_process():
        try:
            # Change to backend directory
            os.chdir('backend')
            
            # Start the backend
            colored_print("Starting Flask backend...", 'blue')
            subprocess.Popen([sys.executable, 'app.py'], 
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE)
            
            # Wait a moment for startup
            import time
            time.sleep(3)
            
            # Test if it started successfully
            if test_backend_health():
                colored_print("✓ Backend started successfully", 'green')
                return True
            else:
                colored_print("✗ Backend failed to start properly", 'red')
                return False
                
        except Exception as e:
            colored_print(f"✗ Error starting backend: {e}", 'red')
            return False
    else:
        colored_print("✓ Backend already running", 'green')
        return True

def main():
    """Main debug function"""
    colored_print("=== Backend Debug Script ===", 'blue')
    print(f"Timestamp: {__import__('datetime').datetime.now()}")
    print(f"Working directory: {os.getcwd()}")
    print()
    
    # Run all checks
    process_running = check_backend_process()
    health_ok = test_backend_health()
    db_ok = check_database()
    check_python_environment()
    
    if not (process_running and health_ok):
        start_backend_if_needed()
        # Re-test after starting
        test_backend_health()
    
    test_api_endpoints()
    
    print()
    colored_print("=== Debug Complete ===", 'blue')
    
    # Summary
    if health_ok:
        colored_print("✓ Backend appears to be working correctly", 'green')
    else:
        colored_print("✗ Backend has issues that need to be addressed", 'red')

if __name__ == '__main__':
    main()

# This file can be deleted - it's only used for debugging