@echo off
title CampusConnect Master Launcher
echo ========================================================
echo   CAMPUS CONNECT - Smart Complaint & Emergency Response
echo ========================================================
echo.
echo Launching Backend Server on port 8000...
start "CampusConnect Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Launching Frontend Server on port 3000...
start "CampusConnect Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo System launched! Close the terminal windows to stop.
