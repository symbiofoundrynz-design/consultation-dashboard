@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  start "AI EcoSphere" cmd /k "py -m http.server 8765 --bind 127.0.0.1"
  timeout /t 2 >nul
  start "" "http://127.0.0.1:8765"
  exit /b 0
)
where python >nul 2>&1
if %errorlevel%==0 (
  start "AI EcoSphere" cmd /k "python -m http.server 8765 --bind 127.0.0.1"
  timeout /t 2 >nul
  start "" "http://127.0.0.1:8765"
  exit /b 0
)
echo Python was not found. Serve this folder with any static web server.
pause
