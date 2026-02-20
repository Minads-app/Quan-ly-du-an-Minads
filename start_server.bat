@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo Stopping old node processes...
taskkill /f /im node.exe /t 2>nul
timeout /t 2 >nul
echo Starting ERP Mini Server on Port 3015...
echo Please wait for "Ready in..." message.
npm run dev -- -p 3015
if %errorlevel% neq 0 (
    echo Error occurred!
    pause
)
pause
