@echo off
title SGOD School Permit System

:: ─────────────────────────────────────────────────
:: 1. Backend – create venv once, then start FastAPI
:: ─────────────────────────────────────────────────
if not exist "backend\.venv\Scripts\python.exe" (
    echo [SETUP] Creating Python virtual environment...
    python -m venv backend\.venv --without-pip
    echo [SETUP] Bootstrapping pip...
    backend\.venv\Scripts\python.exe -m ensurepip --upgrade
    echo [SETUP] Installing backend dependencies (first run only)...
    backend\.venv\Scripts\pip.exe install -r backend\requirements.txt
    echo [SETUP] Done.
)

echo [START] Launching backend on http://localhost:8000 ...
start "SGOD Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

:: ─────────────────────────────────────────────────
:: 2. Frontend – npm install once, then start Vite
:: ─────────────────────────────────────────────────
if not exist "node_modules" (
    echo [SETUP] Installing frontend dependencies (first run only)...
    npm install
)

echo [START] Launching frontend on http://localhost:5173 ...
start "SGOD Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo.
pause
