# Bayesian Adaptive SRS Flashcard System

A research-grade spaced repetition system that uses Bayesian memory modeling for optimal review scheduling.

## Key Features

- **Bayesian Memory Modeling**: Per-card Beta posterior modeling with personalized decay rates
- **Desirable Difficulty Targeting**: Maintains ~80% recall rate for optimal learning
- **Rich Content Support**: Text and images on both sides of cards
- **Cross-platform Desktop App**: Built with Tauri for Mac, Windows, and Linux

## Building the Application

### Prerequisites
- Node.js (v14+)
- Python 3.7+
- Rust and Cargo
- Tauri CLI

### Development Setup
```bash
# Install dependencies for the root project
npm install

# Setup frontend
cd frontend
npm install
cd ..

# Setup backend
cd backend
pip install -r requirements.txt
cd ..
```

### Running the Development Version
```bash
# Start the frontend
cd frontend
npm start
# In another terminal, start the backend
cd backend
python app.py
```

### Building for Production
You can use the provided build script which handles all steps:

```bash
./build-release.sh
```

Or follow these manual steps:

1. Build the frontend:
```bash
cd frontend
npm run build
cd ..
```

2. Bundle the Python backend:
```bash
node scripts/bundle-python.js
```

3. Build the Tauri app:
```bash
npm run tauri build
```

The built application will be available in the `src-tauri/target/release/bundle` directory.

### Building
```bash
npm run build
```

### Development
```bash
npm run dev
```

The final executable will be in `src-tauri/target/release`.

