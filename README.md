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

### Setup
```bash
npm run setup
```

### Building
```bash
npm run build
```

### Development
```bash
npm run dev
```

The final executable will be in `src-tauri/target/release`.

