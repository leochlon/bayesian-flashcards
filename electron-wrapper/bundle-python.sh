#!/bin/bash

# Script to bundle Python and dependencies for Electron app

# Create a virtual environment
python3 -m venv python-bundle

# Activate the virtual environment
source python-bundle/bin/activate

# Install the required packages
pip install -r ../backend/requirements.txt

# Deactivate the virtual environment
deactivate

echo "Python environment has been bundled successfully."