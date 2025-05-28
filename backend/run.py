#!/usr/bin/env python3
"""
Simple script to run the Flask backend server
"""
import os
import sys
import subprocess
import signal
import psutil

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def kill_process_on_port(port):
    """Kill any process running on the specified port"""
    try:
        # Find processes using the port
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                connections = proc.info['connections']
                if connections:
                    for conn in connections:
                        if conn.laddr.port == port:
                            print(f"Found process {proc.info['name']} (PID: {proc.info['pid']}) using port {port}")
                            print(f"Killing process {proc.info['pid']}...")
                            proc.kill()
                            proc.wait(timeout=3)
                            print(f"Process {proc.info['pid']} killed successfully")
                            return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        print(f"Error while checking for processes on port {port}: {e}")
        # Fallback method using lsof and kill
        try:
            print(f"Using fallback method to kill process on port {port}...")
            result = subprocess.run(['lsof', '-ti', f':{port}'], 
                                  capture_output=True, text=True, check=False)
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        print(f"Killing process {pid}...")
                        subprocess.run(['kill', '-9', pid], check=False)
                        print(f"Process {pid} killed successfully")
                return True
        except Exception as fallback_error:
            print(f"Fallback method also failed: {fallback_error}")
    
    return False

if __name__ == '__main__':
    from app import app
    
    # Kill any existing process on port 5002
    print("Checking for existing processes on port 5002...")
    if kill_process_on_port(5002):
        print("Port 5002 cleared successfully")
    else:
        print("No processes found on port 5002")
    
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
