# Aeroscript

A real-time collaborative drawing web application with AI-powered handwriting recognition.

## Features

- 🎨 **Drawing Modes** - Signature, Draw, and Write modes
- 🤝 **Party Mode** - Real-time collaborative drawing
- 📊 **Analytics** - Track your drawing statistics
- 💾 **Session History** - Save and load your drawings
- 📤 **Export** - Export to PNG, JPG, or PDF
- 🎯 **ML Predictions** - AI-powered handwriting recognition (requires trained models)

## Quick Start

### Option 1: One-Click Start (Linux/Mac)
```bash
# Make sure MongoDB is running first!
./start-all.sh
```

### Option 2: Manual Start

**1. Prerequisites**
- Node.js v18+
- MongoDB (local or Atlas)

**2. Clone and Setup**
```bash
git clone https://github.com/PREMSONTAKKE/Aeroscript.git
cd Aeroscript

# Install dependencies
cd server && npm install && cd ..
cd frontend && npm install && cd ..
```

**3. Configure**
```bash
# Copy the example env file
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT secret
```

**4. Run**
```bash
# Terminal 1 - Server
cd server
node index.js

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**5. Open Browser**
- Frontend: http://localhost:5173
- Server API: http://localhost:5002

## Scripts

| Script | Description |
|--------|-------------|
| `start.bat` | Windows setup (check dependencies) |
| `start.sh` | Linux/Mac setup (check dependencies) |
| `start-all.sh` | Start both server & frontend (Linux/Mac) |

## ML Training (Optional)

To enable handwriting prediction:
```bash
cd server

# Train character recognition (EMNIST)
npm run train-ml

# Train word recognition (IAM)
npm run train-word-ml
```

## Docker Deployment

```bash
docker-compose up --build
```

Access at: http://localhost

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Express, Socket.io, MongoDB
- **ML**: Python (scikit-learn, PyTorch), TensorFlow.js
- **Auth**: JWT, bcrypt

## License

ISC