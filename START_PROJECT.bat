@echo off
echo 🚀 Starting FormBharo Services...

:: Kill existing processes on port 8080 and 3000 (Windows)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul

echo [1/2] Starting Python AI Backend (Port 8080)...
start /B cmd /c "cd python_backend && py main.py"

echo [2/2] Starting Next.js Frontend (Port 3000)...
start /B cmd /c "npm run dev"

echo.
echo ✅ ALL SERVICES STARTING!
echo --------------------------------------------------
echo 🌐 Frontend: http://localhost:3000
echo ⚙️  Backend:  http://localhost:8080
echo --------------------------------------------------
echo.
echo 💡 IMPORTANT:
echo    Do NOT use the "Go Live" button in VS Code.
echo    It is NOT compatible with this project.
echo    Please use the URLs above to view your app.
echo.
pause
