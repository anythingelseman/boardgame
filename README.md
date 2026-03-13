# 🎲 Virtual Board Game Sandbox

A premium, interactive 2D tabletop engine for playing board games with friends in real-time. Designed with a focus on tactile interactions, smooth animations, and a seamless sandbox experience.

## ✨ Features

- **Real-time Multiplayer**: Synchronized game state across all players via WebSocket relay.
- **Interactive Sandbox**: Drag, rotate, flip, and stack components with fluid physics-like behavior.
- **Tactile Transitions**: Smooth animations for drawing, shuffling, and playing cards.
- **Multi-Player Hand Management**: Private hands for each player with secure "Request Permission" mechanics for viewing or stealing cards.
- **Integrated Tools**: Built-in dice roller, selection marquee, and activity logs.
- **Editor Mode**: Create and save custom board game setups by importing assets and preparing the play area.

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4.
- **State Management**: Zustand (with state subscription for multiplayer sync).
- **Communication**: WebSocket (Real-time relay server).
- **Design**: Modern, immersive UI with glassmorphism and custom typography.

## 🛠️ Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/yourusername/boardgame.git
cd boardgame
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# Pusher Credentials (for auth API)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1

# Multiplayer WebSocket URL
VITE_RENDER_WS_URL=wss://your-relay-server.onrender.com
```

### 4. Running Locally
**Start the Relay Server:**
```bash
node server.js
```
*Server runs on `ws://localhost:4000`*

**Start the Frontend App:**
```bash
npm run dev
```

## 🎮 How to Play

1. **Create/Join a Room**: Enter a room code in the top toolbar to sync with others.
2. **Editor Mode**: Use the sidebar (in Editor mode) to spawn cards, tokens, and tiles.
3. **Interactions**:
   - **Left Click**: Select and drag objects.
   - **Right Click**: Open context menu (Flip, Rotate, Shuffle, to Hand).
   - **Spacebar**: Preview selected card image.
   - **Escape**: Cancel placement or close modals.
4. **Multiplayer Fair Play**: To view or steal a card from someone's hand, you must send a request. They must click "Approve" on their screen for the action to complete.

---
Developed with ❤️ by the BoardGame Sandbox Team.
