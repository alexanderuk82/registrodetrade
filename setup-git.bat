@echo off
echo =====================================
echo  Trading Journal - Git Setup Script
echo =====================================
echo.

echo Initializing Git repository...
git init

echo.
echo Adding all files...
git add .

echo.
echo Creating initial commit...
git commit -m "Initial commit - Trading Journal with GBP support"

echo.
echo =====================================
echo  IMPORTANT: Next Steps
echo =====================================
echo.
echo 1. Create a new repository on GitHub:
echo    https://github.com/new
echo.
echo 2. Copy your repository URL
echo    (looks like: https://github.com/YOUR_USERNAME/trading-journal.git)
echo.
echo 3. Run this command with YOUR repository URL:
echo    git remote add origin YOUR_REPOSITORY_URL
echo.
echo 4. Push to GitHub:
echo    git branch -M main
echo    git push -u origin main
echo.
echo =====================================
pause
