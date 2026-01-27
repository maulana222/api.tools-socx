@echo off
echo ========================================
echo    Socx Full-Stack Application Launcher
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo Copying from env.example...
    copy env.example .env
    echo.
    echo 📝 Please edit .env file with your database credentials!
    echo Press any key to continue...
    pause
)

echo ✅ Starting Socx Application...
echo.
echo Backend will run on: http://localhost:3000
echo Frontend will run on: http://localhost:9899
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both backend and frontend
npm run dev:full