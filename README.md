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

