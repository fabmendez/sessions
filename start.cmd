@echo off
title Session
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies - first run only, takes a few minutes...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo npm install failed - see the messages above.
    pause
    exit /b 1
  )
)

if not exist .env copy .env.example .env >nul

rem Open the browser once the app has had time to start.
start "" /min cmd /c "timeout /t 20 /nobreak >nul & start http://localhost:3000"

call npm.cmd run local %*
pause
