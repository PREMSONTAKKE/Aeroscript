# Aeroscript

A real-time collaborative digital canvas with air-writing and hand-tracking.

## Features

- **Drawing Modes** - Signature, Draw, and Write modes
- **Party Mode** - Real-time collaborative drawing
- **Analytics** - Track your drawing statistics
- **Session History** - Save and load your drawings
- **Export** - Export to PNG, JPG, or PDF
- **Hand Tracking** - Air-writing via MediaPipe hand tracking

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Setup
```bash
git clone https://github.com/PREMSONTAKKE/Aeroscript.git
cd Aeroscript
```

### Install dependencies
```bash
cd server && npm install && cd ..
cd frontend && npm install && cd ..
```

### Configure
```bash
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT secret
```

### Run
```bash
# Terminal 1 - Server
cd server && node index.js

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Open Browser
- Frontend: http://localhost:5173
- Server API: http://localhost:5002

## Deployment

### Frontend (Vercel)
Deploy `frontend/` to Vercel. Set environment variables:
- `VITE_API_URL` - Your backend URL (e.g. `https://aeroscript-api.onrender.com`)
- `VITE_SOCKET_URL` - Your backend URL (same as API)
- `VITE_FIREBASE_API_KEY` - Firebase Web App API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

### Backend (Render)
Deploy `server/` to Render as a Web Service. Configure:
- **Root Directory**: `server`
- **Runtime**: `Docker`
- **Port**: `5002`

Set environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `CORS_ORIGINS` - Comma-separated list of allowed frontend origins
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON, minified to a single line
- `PORT` - Server port (default: 5002)
- `NODE_ENV` - `production`

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Firebase Auth
- **Backend**: Express, Socket.IO, MongoDB, Firebase Admin
- **Hand Tracking**: MediaPipe Tasks Vision (browser-based)
- **Auth**: JWT, Firebase Auth with Google provider (server-side verification via Firebase Admin)

## License

ISC
