@echo off
echo ============================================
echo   Aeroscript - Quick Start Script
echo ============================================
echo.

REM Check if MongoDB is running
echo [1/4] Checking MongoDB...
mongosh --eval "db.adminCommand('ping')" >nul 2>&1
if errorlevel 1 (
    echo   ERROR: MongoDB is not running!
    echo   Please start MongoDB first:
    echo   - Run 'mongod' in a terminal, OR
    echo   - Use MongoDB Compass or Atlas
    echo.
    pause
    exit /b 1
)
echo   MongoDB: OK

REM Check if Node.js is installed
echo [2/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js is not installed!
    echo   Download from: https://nodejs.org
    pause
    exit /b 1
)
echo   Node.js: OK

REM Install server dependencies
echo [3/4] Installing server dependencies...
cd server
if not exist node_modules (
    npm install
)
cd ..

REM Install frontend dependencies
echo [4/4] Installing frontend dependencies...
cd frontend
if not exist node_modules (
    npm install
)
cd ..

echo.
echo ============================================
echo   Setup complete!
echo ============================================
echo.
echo Now open TWO separate terminals:
echo.
echo TERMINAL 1 - Run this:
echo   cd server
echo   node index.js
echo.
echo TERMINAL 2 - Run this:
echo   cd frontend
echo   npm run dev
echo.
echo Then open http://localhost:5173 in your browser
echo.
pause