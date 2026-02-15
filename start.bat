@echo off
REM Quiz App - Auto Start Script (Windows)
REM This script starts both backend and frontend servers concurrently

echo 🚀 Starting Quiz App...
echo.

REM Check if node_modules exist, if not, install dependencies
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    call npm install
)

if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ✅ Dependencies installed
echo.
echo Starting servers...
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend in a new window
start "Quiz App - Backend" cmd /k "cd backend && npm start"

REM Start frontend in a new window
start "Quiz App - Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers are starting in separate windows...
pause
