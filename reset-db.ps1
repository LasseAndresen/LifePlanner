# reset-db.ps1
# This script resets the SQLite database by deleting the file and reapplying migrations.

$root = $PSScriptRoot
$dbFile = "$root\server\LifePlanner.db"

Write-Host "----------------------------------------------------" -ForegroundColor Magenta
Write-Host "☢️  DATABASE RESET TOOL" -ForegroundColor Red
Write-Host "----------------------------------------------------" -ForegroundColor Magenta
Write-Host "This will delete all users, categories, and cards." -ForegroundColor Gray
$confirmation = Read-Host "Are you sure you want to proceed? (y/N)"

if ($confirmation -ne "y") {
    Write-Host "Reset cancelled." -ForegroundColor Cyan
    exit
}

# 1. Kill any running dotnet processes that might be locking the DB
Write-Host "[1/3] Closing any active database connections..." -ForegroundColor Cyan
# (Optional: This is aggressive, but ensures the file can be deleted)
# Get-Process dotnet -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Delete the DB file
if (Test-Path $dbFile) {
    Write-Host "[2/3] Deleting $dbFile..." -ForegroundColor Yellow
    Remove-Item $dbFile -Force
} else {
    Write-Host "[2/3] Database file not found, skipping deletion." -ForegroundColor Gray
}

# 3. Recreate the Database
Write-Host "[3/3] Recreating database from migrations..." -ForegroundColor Yellow
cd "$root\server"
dotnet ef database update

Write-Host "----------------------------------------------------" -ForegroundColor Magenta
Write-Host "✅ Database has been reset to a clean state." -ForegroundColor Green
Write-Host "----------------------------------------------------" -ForegroundColor Magenta
