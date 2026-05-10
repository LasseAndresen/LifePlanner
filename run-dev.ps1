# run-dev.ps1
# This script starts both the .NET Backend and Angular Frontend for local development.

$root = $PSScriptRoot

Write-Host "🚀 Starting LifePlanner Development Environment..." -ForegroundColor Magenta
Write-Host "----------------------------------------------------"

# 1. Start Backend (dotnet watch)
# dotnet watch will automatically rebuild and restart the server when files change.
Write-Host "[1/2] Launching Backend on http://localhost:5197..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; Write-Host '--- Backend Logs ---' -ForegroundColor Cyan; dotnet watch run"

# 2. Start Frontend (npm start)
# npm start (ng serve) will serve the Angular app with hot-reloading.
Write-Host "[2/2] Launching Frontend on http://localhost:4200..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; Write-Host '--- Frontend Logs ---' -ForegroundColor Yellow; npm start"

Write-Host "----------------------------------------------------"
Write-Host "✅ Both processes are starting in separate windows." -ForegroundColor Green
Write-Host "Backend: http://localhost:5197" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Gray
