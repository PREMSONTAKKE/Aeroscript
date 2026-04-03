# Aeroscript

A real-time collaborative drawing web application with AI-powered handwriting recognition.

## Features

- **Drawing Modes** - Signature, Draw, and Write modes
- **Party Mode** - Real-time collaborative drawing
- **Analytics** - Track your drawing statistics
- **Session History** - Save and load your drawings
- **Export** - Export to PNG, JPG, or PDF
- **ML Predictions** - AI-powered handwriting recognition

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
- `VITE_API_URL` - Your backend URL
- `VITE_SOCKET_URL` - Your backend URL (same as API)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID

### Backend (Railway/Render)
Deploy `server/` to Railway or Render. Set environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `PORT` - Server port (default: 5002)

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Express, Socket.IO, MongoDB
- **ML**: TensorFlow.js (browser-based hand tracking)
- **Auth**: JWT, bcrypt

## License

ISC
