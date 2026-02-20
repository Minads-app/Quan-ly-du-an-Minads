@echo off
echo Fixing Git State...

:: 1. Remove existing origin to clean up
git remote remove origin 2>nul

:: 2. Create the first commit (Critical step that failed before)
git add .
git commit -m "Initial deployment"

:: 3. Rename branch to main
git branch -M main

:: 4. Add the correct remote URL (from your command history)
git remote add origin https://github.com/Minads-app/Quan-ly-du-an-Minads.git

echo.
echo [OK] Git repository fixed and linked to: https://github.com/Minads-app/Quan-ly-du-an-Minads.git
echo.
echo You can now use 'push_to_github.bat' to upload your code.
pause
