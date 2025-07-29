@echo off
echo Starting Quiz App servers...
echo.

start "Backend Server" cmd /k "cd backend && npm start"
timeout /t 3 >nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
