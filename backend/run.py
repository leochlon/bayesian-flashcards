#!/usr/bin/env python3
"""
Simple script to run the Flask backend server
"""
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == '__main__':
    from app import app
    
    print("Starting Bayesian Flashcards backend on http://127.0.0.1:5002")
    print("Press Ctrl+C to stop the server")
    
    try:
        app.run(
            host='127.0.0.1',
            port=5002,
            debug=False,  # Set to False for production
            threaded=True
        )
    except KeyboardInterrupt:
        print("\nShutting down server...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
