@echo off
setlocal
title Deploy Session
cd /d "%~dp0"
set /p "TARGET=Server to deploy to (e.g. root@1.2.3.4): "
if "%TARGET%"=="" (echo No server given. & pause & exit /b 1)
set "REMOTE=/opt/session"

where ssh >nul 2>nul || (echo OpenSSH client not found. Install it in Settings ^> System ^> Optional features. & pause & exit /b 1)

echo Packing the project...
if exist "%TEMP%\session-deploy.tgz" del "%TEMP%\session-deploy.tgz"
tar -czf "%TEMP%\session-deploy.tgz" --exclude=node_modules --exclude=.next --exclude=.pglite --exclude=.pglite.lock --exclude=.git --exclude=.env --exclude=*.tsbuildinfo .
if errorlevel 1 (echo Packing failed. & pause & exit /b 1)

echo.
echo Uploading to %TARGET% - enter your VPS password if asked.
scp "%TEMP%\session-deploy.tgz" %TARGET%:/tmp/session-deploy.tgz
if errorlevel 1 (echo Upload failed. & pause & exit /b 1)

echo.
echo Building on the server - enter your VPS password again if asked.
ssh -t %TARGET% "mkdir -p %REMOTE% && tar -xzf /tmp/session-deploy.tgz -C %REMOTE% && rm /tmp/session-deploy.tgz && sed -i s/r$// %REMOTE%/deploy.sh && bash %REMOTE%/deploy.sh"
echo.
pause
