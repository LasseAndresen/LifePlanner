# run-prod-docker.ps1
# This script builds and starts the LifePlanner production containers via Docker Compose.

$root = $PSScriptRoot

Write-Host "🐳 Building and Starting LifePlanner Production Docker Environment..." -ForegroundColor Magenta
Write-Host "----------------------------------------------------"

# Check if Docker command is available and daemon is running
$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if (!$dockerCheck) {
    Write-Host "❌ Docker CLI not found. Please install Docker/Docker Desktop." -ForegroundColor Red
    Exit 1
}

# Verify Docker daemon connection
docker info > $null 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "❌ Docker daemon is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    Exit 1
}

Write-Host "🚀 Running Docker Compose (this may take a few minutes on first run)..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the containers." -ForegroundColor Gray
Write-Host "----------------------------------------------------"

# Run docker-compose up
Set-Location -Path $root
docker-compose -f docker-compose.prod.yml up --build

Write-Host "----------------------------------------------------"
Write-Host "✅ Docker containers stopped." -ForegroundColor Green
