#!/bin/bash

# Build script for Bayesian Flashcards macOS app

echo "=== Building Bayesian Flashcards macOS Application ==="
echo ""

# Step 1: Build the React frontend
echo "Step 1: Building React frontend..."
cd ../srs-frontend
npm install
npm run build
mkdir -p ../electron-wrapper/build
cp -r build/* ../electron-wrapper/build/
echo "✓ Frontend built successfully"
echo ""

# Step 2: Bundle Python and dependencies
echo "Step 2: Bundling Python environment..."
cd ../electron-wrapper
./bundle-python.sh
echo "✓ Python environment bundled successfully"
echo ""

# Step 3: Package the Electron app
echo "Step 3: Building Electron app..."
npm install
npm run build-electron
echo "✓ Electron app built successfully"
echo ""

echo "=== Build Complete ==="
echo ""
echo "Your macOS application is available in the dist folder:"
echo "$(pwd)/dist"
echo ""
echo "You can distribute the .dmg file to users for easy installation."