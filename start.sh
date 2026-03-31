#!/bin/bash

echo "============================================"
echo "  Aeroscript - Quick Start Script"
echo "============================================"
echo ""

# Check if MongoDB is running
echo "[1/4] Checking MongoDB..."
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.adminCommand('ping')" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "  MongoDB: OK"
    else
        echo "  WARNING: MongoDB may not be running!"
        echo "  Start with: mongod"
    fi
elif command -v mongo &> /dev/null; then
    mongo --eval "db.adminCommand('ping')" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "  MongoDB: OK"
    else
        echo "  WARNING: MongoDB may not be running!"
    fi
else
    echo "  WARNING: MongoDB not found!"
    echo "  Install MongoDB or use MongoDB Atlas"
fi

# Check if Node.js is installed
echo "[2/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js is not installed!"
    echo "  Download from: https://nodejs.org"
    exit 1
fi
echo "  Node.js: $(node --version)"

# Install server dependencies
echo "[3/4] Installing server dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# Install frontend dependencies
echo "[4/4] Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Now open TWO separate terminals:"
echo ""
echo "TERMINAL 1 - Run this:"
echo "  cd server"
echo "  node index.js"
echo ""
echo "TERMINAL 2 - Run this:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser"
echo ""