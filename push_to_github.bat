@echo off
set "PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd"

echo ==========================================
echo       AUTO PUSH TO GITHUB SCRIPT
echo ==========================================
echo.

:: Check allowed branch
git branch --show-current | findstr "main master" >nul
if %errorlevel% neq 0 (
    echo [WARNING] You are not on main/master branch.
    echo Current branch: 
    git branch --show-current
    set /p "continue=Do you want to continue? (y/n): "
    if /i "%continue%" neq "y" exit /b
)

echo Adding all changes...
git add .

echo Committing...
set "timestamp=%date% %time%"
git commit -m "Auto update: %timestamp%"

echo Pushing to remote...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push failed!
    echo Please check your internet connection or GitHub credentials.
    echo.
    pause
    exit /b
)

echo.
echo [SUCCESS] Code pushed to GitHub successfully!
echo Vercel will automatically deploy the new version shortly.
echo.
pause
