[CmdletBinding()]
param(
    [string]$RepoPath = "F:\LF\pachimanga"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RepoPath)) {
    throw "Repository not found: $RepoPath"
}

if (-not (Get-Command hermes -ErrorAction SilentlyContinue)) {
    throw "Hermes CLI was not found on PATH. Install Hermes Agent first, then rerun this script."
}

Set-Location $RepoPath

if (-not (Test-Path ".git")) {
    throw "The path is not the Pachimanga git checkout: $RepoPath"
}

hermes config set terminal.backend local
hermes config set terminal.cwd $RepoPath
hermes skills trust $RepoPath
hermes doctor

Write-Host ""
Write-Host "Hermes is configured for Pachimanga."
Write-Host "Start it with:"
Write-Host "  Set-Location '$RepoPath'"
Write-Host "  hermes"
