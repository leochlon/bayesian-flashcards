#!/bin/zsh
# Script to build a production release of Bayesian Flashcards

# Set up error handling
set -e
echo "Starting production build process for Bayesian Flashcards..."

# Save the root directory path
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Root directory: $ROOT_DIR"

# 1. Build the frontend
echo "\n[1/5] Building frontend..."
cd "$ROOT_DIR/frontend"
npm install
npm run build
echo "Frontend build complete."

# 2. Bundle Python backend
echo "\n[2/5] Bundling Python backend..."
cd "$ROOT_DIR"  # Go back to the root directory
echo "Current directory: $(pwd)"

if [ -f "./scripts/bundle-python.js" ]; then
  echo "Script file exists at ./scripts/bundle-python.js"
  node ./scripts/bundle-python.js
else
  echo "Script file does not exist at ./scripts/bundle-python.js"
  echo "Contents of current directory:"
  ls -la
  echo "Contents of scripts directory (if it exists):"
  if [ -d "./scripts" ]; then
    ls -la ./scripts
  else
    echo "scripts directory does not exist"
  fi
  exit 1
fi
echo "Python backend bundled successfully."

# 3. Build Tauri app
echo "\n[3/5] Building Tauri app..."
cd "$(dirname "$0")"
npm install
npm run tauri build
echo "Tauri build complete."

# 4. Create the release directory for distribution
echo "\n[4/5] Preparing release files..."
mkdir -p "$(dirname "$0")/release"

# 5. Copy built files
echo "\n[5/5] Copying release files..."

# macOS
if [ -d "$(dirname "$0")/src-tauri/target/release/bundle/macos" ]; then
  cp -R "$(dirname "$0")/src-tauri/target/release/bundle/macos" "$(dirname "$0")/release/"
  echo "macOS app copied to release folder"
fi

# Windows
if [ -d "$(dirname "$0")/src-tauri/target/release/bundle/msi" ]; then
  cp -R "$(dirname "$0")/src-tauri/target/release/bundle/msi" "$(dirname "$0")/release/"
  echo "Windows MSI installer copied to release folder"
fi

# Linux
if [ -d "$(dirname "$0")/src-tauri/target/release/bundle/deb" ]; then
  cp -R "$(dirname "$0")/src-tauri/target/release/bundle/deb" "$(dirname "$0")/release/"
  echo "Linux DEB package copied to release folder"
fi
if [ -d "$(dirname "$0")/src-tauri/target/release/bundle/appimage" ]; then
  cp -R "$(dirname "$0")/src-tauri/target/release/bundle/appimage" "$(dirname "$0")/release/"
  echo "Linux AppImage copied to release folder"
fi

echo "\n✅ Build process complete! Release files are in the 'release' directory."
