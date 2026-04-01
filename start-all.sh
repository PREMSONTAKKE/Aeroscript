#!/bin/bash

echo "============================================"
echo "  Aeroscript - Start Both Server & Frontend"
echo "============================================"
echo ""

# Check if MongoDB is running
echo "Checking MongoDB..."
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.adminCommand('ping')" &> /dev/null
    if [ $? -ne 0 ]; then
        echo "ERROR: MongoDB is not running!"
        echo "Please start MongoDB first, then run this script."
        exit 1
    fi
elif command -v mongo &> /dev/null; then
    mongo --eval "db.adminCommand('ping')" &> /dev/null
    if [ $? -ne 0 ]; then
        echo "ERROR: MongoDB is not running!"
        echo "Please start MongoDB first, then run this script."
        exit 1
    fi
else
    echo "WARNING: MongoDB not found! Install or use MongoDB Atlas."
fi
echo "MongoDB: OK"
echo ""

# Create .env if not exists
if [ ! -f "server/.env" ]; then
    echo "Creating server/.env..."
    cp server/.env.example server/.env
fi

# Start server in background
echo "Starting server..."
cd server
node index.js &
SERVER_PID=$!
cd ..

# Wait a bit for server to start
sleep 2

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  Aeroscript is running!"
echo "============================================"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Server:   http://localhost:5002"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait