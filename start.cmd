@echo off
setlocal
title Session
cd /d "%~dp0"

rem Find Node.js even when this window's PATH is out of date (common right after installing Node).
where node >nul 2>nul
if errorlevel 1 (
  for %%D in ("%ProgramFiles%\nodejs" "%ProgramFiles(x86)%\nodejs" "%LOCALAPPDATA%\Programs\nodejs" "%NVM_SYMLINK%" "%APPDATA%\nvm\current" "%LOCALAPPDATA%\Volta\bin") do (
    if exist "%%~D\node.exe" set "PATH=%%~D;%PATH%"
  )
)
where node >nul 2>nul
if errorlevel 1 (
  echo Could not find Node.js on this PC.
  echo Install the LTS version from https://nodejs.org, restart your PC, then run this again.
  pause
  exit /b 1
)
for /f "delims=" %%V in ('node -v') do echo Using Node %%V

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
start "" /min cmd /c "timeout /t 25 /nobreak >nul & start http://localhost:3000"

call npm.cmd run local %*
pause
