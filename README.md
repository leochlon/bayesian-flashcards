# Bayesian Adaptive SRS Flashcard System (ADHD-aware)

This project implements a research-grade, fully extensible **spaced repetition system (SRS)** that leverages Bayesian memory modeling and adaptive cognitive features for individualized, optimal review scheduling. It’s designed to support diverse learners, with special consideration for users with ADHD and variable attention.

---

## Key Features

### 📊 Bayesian Memory Modeling
- Every card’s review interval is computed using a per-card Beta posterior, modeling memory decay and recall probability over time.
- Personalized decay rates are further adapted from global user recall statistics.

### 🎯 Desirable Difficulty Targeting
- Schedules reviews to maintain an empirically optimal ~80% correct recall rate (“desirable difficulty”).
- Automatically adjusts intervals to prevent both under- and overlearning.

### 🧠 Cognitive & Behavioral Adaptivity
- **Pomodoro-based session management** with dynamic fatigue detection and session break suggestions.
- **Real-time focus drop monitoring** and review rebalancing (“rescue mode”) to mitigate distractions or attention lapses.
- **Meta-cognitive spot-checks** and calibration for self-assessment accuracy.

### 🖼️ Rich Content Support
- Create and study flashcards with rich text and images on both front and back.
- Organize cards into decks.

### 🛠️ Modern, Modular Stack
- **Frontend:** React, with support for rich text editors, image upload, and live Bayesian visualizations (Plotly/Chart.js).
- **Backend:** Python (Flask/FastAPI) for all memory modeling, session scheduling, and data endpoints.
- **Desktop-ready:** Ships as a cross-platform desktop app (Mac, Windows, Linux) via Tauri or Electron.

### 📈 Data-Driven Visualization
- Live visual feedback for Bayesian recall distributions, interval histories, session progress, and cognitive indicators—all toggleable during study.

---

# Bayes Flashcards

A Bayesian adaptive spaced repetition system for flashcards.

## Building the Application

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Rust and Cargo (for Tauri)
- Python 3.7+ (for the backend)

### Setup

Install all dependencies with:

```bash
npm run setup
```

This will:
- Install frontend npm dependencies
- Install Python backend dependencies
- Install Tauri CLI

### Building

To build the entire application:

```bash
npm run build
```

This command:
1. Builds the React frontend
2. Bundles the Python backend
3. Packages everything into a Tauri desktop application

### For Development

Run the application in development mode:

```bash
npm run dev
```

Or run just the Tauri development environment:

```bash
npm run tauri:dev
```

### Manual Build Process

If you need to run each step manually:

1. Bundle the Python backend:
   ```bash
   npm run bundle:python
   ```

2. Build the React frontend:
   ```bash
   npm run frontend:build
   ```

3. Build the Tauri application:
   ```bash
   npm run tauri:build
   ```

The final executable will be available in the `src-tauri/target/release` directory.

