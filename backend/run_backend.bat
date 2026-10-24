@echo off
title CampusConnect Backend API
cd /d "%~dp0"
echo Starting CampusConnect Backend on http://localhost:8000 ...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
