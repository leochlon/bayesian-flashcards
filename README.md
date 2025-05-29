# Bayesian Adaptive SRS Flashcard System

A research-grade spaced repetition system that uses Bayesian memory modeling for optimal review scheduling.

## Key Features

- **Bayesian Memory Modeling**: Per-card Beta posterior modeling with personalized decay rates
- **Desirable Difficulty Targeting**: Maintains ~80% recall rate for optimal learning
- **Rich Content Support**: Text and images on both sides of cards
- **Cross-platform Desktop App**: Built with Tauri for Mac, Windows, and Linux
- **Optimized DMG Distribution**: Production builds are optimized for size (~200MB vs original 777MB)

## Prerequisites

- **Node.js** (v16+) - [Download](https://nodejs.org/)
- **Python** (3.9+) - [Download](https://python.org/)
- **Rust and Cargo** - [Install via rustup](https://rustup.rs/)
- **Tauri CLI** - Install with: `npm install -g @tauri-apps/cli`

## Quick Start

### Running the Web Application

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd bayesFlashcards
   ```

2. **Install root dependencies:**
   ```bash
   npm install
   ```

3. **Setup and run the backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
   The backend will start on http://localhost:5002

4. **Setup and run the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   The frontend will start on http://localhost:3000

5. **Open your browser** to http://localhost:3000

### Running the Desktop Application

For development testing of the desktop app:

```bash
npm run tauri dev
```

This will start both the backend and frontend automatically and launch the desktop app.

## Building for Production

### One-Click Build (Recommended)

Use the automated build script that handles all steps:

```bash
chmod +x build-release.sh
./build-release.sh
```

This script will:
1. Build the React frontend
2. Bundle the Python backend with optimized dependencies
3. Build the Tauri desktop app
4. Create platform-specific installers (DMG for macOS, MSI for Windows, etc.)
5. Copy all release files to the `release/` directory

### Manual Build Steps

If you prefer to build manually:

1. **Build the frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

2. **Bundle the Python backend:**
   ```bash
   node scripts/bundle-python-optimized.js
   ```

3. **Build the Tauri desktop app:**
   ```bash
   npm install
   npm run tauri build
   ```

### Build Output Locations

After building, you'll find the distributables in:

- **macOS**: `src-tauri/target/release/bundle/macos/*.dmg`
- **Windows**: `src-tauri/target/release/bundle/msi/*.msi`
- **Linux**: `src-tauri/target/release/bundle/deb/*.deb` and `src-tauri/target/release/bundle/appimage/*.AppImage`
- **Release copies**: `release/` directory (created by build script)

## Development

### Project Structure

```
bayesFlashcards/
├── backend/                 # Python Flask API
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── bayesian/           # Bayesian modeling algorithms
│   ├── routes/             # API endpoints
│   └── requirements.txt    # Python dependencies
├── frontend/               # React web application
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   └── build/              # Built frontend (generated)
├── src-tauri/              # Tauri desktop app configuration
│   ├── src/                # Rust source code
│   ├── tauri.conf.json     # Tauri configuration
│   ├── python-dist/        # Bundled Python backend (generated)
│   └── python-portable/    # Python runtime (generated)
├── scripts/                # Build and utility scripts
└── build-release.sh        # Automated build script
```

### Backend API Endpoints

- `GET /api/health` - Health check
- `GET /api/decks` - Get all flashcard decks
- `GET /api/decks/{id}/cards` - Get cards in a deck
- `POST /api/sessions` - Start a study session
- `PUT /api/sessions/{id}/response` - Submit card response

### Bayesian Algorithm

The system uses Beta-Binomial modeling to track each card's difficulty and the user's memory strength:

- **Card Difficulty**: Modeled as `Beta(α_d, β_d)` 
- **Memory Strength**: Modeled as `Beta(α_m, β_m)`
- **Recall Probability**: Combines difficulty and memory with decay over time
- **Optimal Scheduling**: Targets ~80% recall probability for desirable difficulty

## Troubleshooting

### Common Issues

1. **"Network Error" in desktop app**: The Python backend may be slow to start. Wait 30-60 seconds and refresh.

2. **DMG size too large**: Use the optimized build script which removes unnecessary dependencies and creates symlinks.

3. **Python import errors**: Ensure all dependencies are installed with `pip install -r requirements.txt`

4. **Build fails**: Make sure all prerequisites are installed and up to date.

### Backend Dependencies

The backend requires these Python packages:
- Flask, Flask-CORS, Flask-SQLAlchemy, Flask-Migrate
- numpy, scipy, matplotlib (for Bayesian calculations)
- psutil (for system monitoring)

### Debugging

- **Backend logs**: Check console output when running `python app.py`
- **Frontend logs**: Check browser developer console
- **Desktop app logs**: Check terminal output when running `npm run tauri dev`

## License

This project is licensed under the MIT License.

