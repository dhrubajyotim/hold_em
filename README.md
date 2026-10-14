# Championship Texas Hold'em Tournament ♠️♥️♦️♣️

A real-time multiplayer Texas Hold'em Championship Tournament platform featuring an ultra-fast asynchronous **Rust game engine** and a modern, responsive **React (Vite) frontend**. Supports up to 10 players per table with human players, intelligent bot personalities, authentic tournament blind escalation schedules, side-pot calculations, and realistic sound synthesis.

---

## ✨ Features

- **High-Performance Rust Backend**:
  - Built with `tokio`, `warp` / WebSocket architecture, and `sqlite3` persistence.
  - Complete 7-card evaluator, side-pot resolution, and deterministic pot splitting.
  - Intelligent multi-personality bots (Aggressive, Tight-Passive, Balanced, Calling Station).
  - Dynamic tournament blind escalation (custom structures starting at 100 Big Blinds for 3k, 5k, 10k, and 20k stacks).
  - Automated room garbage collection (prevents bot-only or zombie tables).

- **Rich, Interactive React UI**:
  - Authentic casino-grade oval poker table with smooth CSS glassmorphism styling.
  - Turn timers with auto-fold/auto-check countdown bars.
  - Sequential community card unfolding (Flop, Turn, River) and hole card reveal animations.
  - Interactive Action Console with quick-bet presets (Min, 2.5x, Half Pot, Pot, All-in).
  - Speech bubbles for live player actions (Check, Call, Bet, Raise, Fold).
  - Rich Web Audio sound engine synthesizing chip clinks, card snaps, dealing, and winning fanfares without external audio dependencies.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Web Audio API, Vanilla CSS
- **Backend**: Rust 2021, Tokio, Warp, Rusqlite, Serde, Rand

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/) (v1.75+)

### 1. Run the Backend (Rust Engine)

```bash
cd server
cargo run --release
```

The server starts on `http://127.0.0.1:3001` (WebSocket: `ws://127.0.0.1:3001/ws`).

### 2. Run the Frontend (Vite)

In the root directory:

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to create or join a tournament room.

---

## 📜 License

MIT License.
