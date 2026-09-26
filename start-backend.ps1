# SatQuery AI Backend Startup Script
# Run this from the project root: .\start-backend.ps1
# This starts the CORRECT backend with all API routes including agriculture assessment

Write-Host "Starting SatQuery AI Backend (backend.main:app)..." -ForegroundColor Cyan
Write-Host "API will be available at http://localhost:8000" -ForegroundColor Green
Write-Host "Docs at http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
