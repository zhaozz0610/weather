@echo off
setlocal
cd /d "%~dp0"

if not exist ".git\HEAD" (
  if exist ".git" rmdir /s /q ".git"
  git init -b main
)

git remote remove origin >nul 2>nul
git remote add origin git@github.com:zhaozz0610/weather.git

git add .gitignore .github outputs start-weather-dashboard.bat deploy-to-github.bat
git commit -m "Deploy weather dashboard" || echo Nothing new to commit.
git push -u origin main

echo.
echo If push succeeds, open GitHub repo Settings ^> Pages and set Source to GitHub Actions.
pause
