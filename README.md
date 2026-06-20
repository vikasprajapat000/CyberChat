# Cyber Chat (cc) 💬

Cyber Chat is a modern, real-time, responsive chat application built with **React.js (Vite)** on the frontend and **Node.js + Express.js + Socket.IO** on the backend. Designed for premium aesthetics (glassmorphism, tailored HSL theme variables, smooth micro-animations), it supports one-to-one private chats, public channels, user blocklists, notification chime synthesizers, and media sharing.

To make deployment seamless and lightweight, the application stores data temporarily in the server's memory (**no MongoDB database required**).

---

## 🚀 Features

- **Authentication**: Simple, passwordless username-based login. Automatically assigns a unique user ID and custom initials-based gradient avatar.
- **Real-Time Delivery**: Bidirectional message propagation using Socket.IO, with read checkmarks and message timestamps.
- **Rich Message Actions**:
  - Reply contextually to any message
  - Pin important messages to the top of conversations
  - Copy messages to clipboard
  - Edit or delete messages for everyone (broadcasts system alerts)
  - Delete messages locally for "me"
- **Media Support**: Drag-and-drop file sharing (Images, PDFs, documents up to 10MB) with upload indicators and preview thumbnails.
- **Dynamic Indicators**: Multi-user typing notifications ("Vikas Prajapat is typing..."), online/offline statuses, and "last seen" trackers.
- **Privacy & Controls**: Toggle chimes, authorize browser desktop popups, block contacts (silently prevents delivery), mute notifications, and file abuse reports.
- **Screenshots Awareness Demo**: Displays a browser disclaimer indicating web screenshot capture limitations, along with a simulated "Report Screenshot" trigger that flashes safety notices to other chat members.
- **Responsive Layout**: Fluid transition from split panels (desktop/tablet) to single detail screens with back controls (mobile).
- **Offline Safeguards**: Automatic reconnection hooks and yellow status warning banner when connection to backend drops.

---

## 📁 Project Structure

```text
CyberChat/
├── shared/
│   └── constants.js             # Shared Event Names & Default Rooms
├── backend/
│   ├── public/uploads/          # Local static upload store
│   ├── server.js                # Express & Static file server setup
│   ├── socketHandler.js         # Socket.IO Event listener mapping
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx        # Login panel with live initials preview
│   │   │   ├── Sidebar.jsx      # Channels list, contacts, settings controls
│   │   │   ├── ChatLayout.jsx   # Grid coordinator & mobile view triggers
│   │   │   ├── ChatArea.jsx     # Messaging window, file drop, replies
│   │   │   ├── EmojiPicker.jsx  # Categorized emoji selector popover
│   │   │   └── UserProfileModal.jsx # Block, mute, report popups
│   │   ├── hooks/
│   │   │   └── useSocket.js     # WebSocket connection hooks
│   │   ├── utils/
│   │   │   └── audio.js         # Audio API bubble chime synth
│   │   ├── index.css            # HSL typography, keyframes, scrollbars
│   │   ├── App.jsx              # Main App entry point
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🛠️ Local Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm (installed with Node)

### 1. Set Up the Shared constants
The `shared/` directory contains event definitions used by both sides. No extra setup is needed for it.

### 2. Configure & Run Backend Server
Navigate to the backend directory, install packages, and spin up the development engine:
```bash
cd backend
npm install
npm run dev
```
The server will boot on `http://localhost:5000`. It will automatically create a `public/uploads/` directory on startup.

### 3. Configure & Run Frontend Server
In a new terminal window, navigate to the frontend directory, install packages, and start the Vite server:
```bash
cd frontend
npm install
npm run dev
```
The client dashboard will load on `http://localhost:5173`. Vite is configured with a development proxy that automatically forwards requests from `/api/*` and `/socket.io/*` to the server at port 5000.

---

## ⚙️ Environment Variables

### Backend (`backend/.env` - Optional)
- `PORT`: Port server runs on (defaults to `5000`).
- `FRONTEND_URL`: In production, set this to your Vercel address to restrict CORS (e.g. `https://cyber-chat-cc.vercel.app`).

### Frontend (`frontend/.env` - Optional)
- `VITE_BACKEND_URL`: URL of the deployed Express backend (e.g. `https://cyber-chat-backend.onrender.com`).
  - *Note: Leave blank or set to empty string in development so the Vite local reverse proxy is utilized.*

---

## ☁️ Deployment Instructions

### Deploying the Backend on Render
1. Sign in to [Render](https://render.com/).
2. Create a new **Web Service** and link your Git repository.
3. Configure the following service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add these **Environment Variables**:
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: (Your Vercel deployment URL)
5. Click **Deploy Web Service**. Render will assign a public URL (e.g. `https://cyber-chat-backend.onrender.com`).

---

### Deploying the Frontend on Vercel
1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New Project** and select your Git repository.
3. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variable** in the Vercel console:
   - `VITE_BACKEND_URL`: (Your Render Web Service URL e.g. `https://cyber-chat-backend.onrender.com`)
5. Click **Deploy**. Vercel will build and assign you a live, production-grade URL.
