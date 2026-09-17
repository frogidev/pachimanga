param(
  [int]$Port = 3000,
  [switch]$Install,
  [switch]$Verify,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "'$Name' was not found in PATH."
  }
}

function Test-EnvValue([string]$Text, [string]$Name) {
  $pattern = "(?m)^\s*" + [regex]::Escape($Name) + "\s*=\s*(.+?)\s*$"
  $match = [regex]::Match($Text, $pattern)
  if (-not $match.Success) { return $false }

  $value = $match.Groups[1].Value.Trim().Trim('"').Trim("'")
  return -not [string]::IsNullOrWhiteSpace($value)
}

Require-Command node
Require-Command npm

$nodeVersionText = (& node --version).TrimStart('v')
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion.Major -lt 22) {
  throw "Node.js 22+ is required. Found v$nodeVersionText."
}

$package = Get-Content (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json

Write-Host "Pachimanga local PWA launcher" -ForegroundColor Magenta
Write-Host "Repository: $repoRoot"
Write-Host "Node:       v$nodeVersionText"
Write-Host "Required:   $($package.engines.node)"

$envFile = Join-Path $repoRoot '.env.local'
if (-not (Test-Path $envFile)) {
  throw ".env.local is missing. Copy .env.example to .env.local and configure Supabase before starting."
}

$envText = Get-Content $envFile -Raw
$requiredEnv = @(
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
)

$missingEnv = @($requiredEnv | Where-Object { -not (Test-EnvValue $envText $_) })
if ($missingEnv.Count -gt 0) {
  throw ".env.local is missing required value(s): $($missingEnv -join ', ')"
}

if ($Install -or -not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
  Write-Step "Installing exact dependencies with npm ci"
  & npm ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if ($Verify) {
  Write-Step "Running the full local quality gate"
  & npm run verify
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$url = "http://localhost:$Port"

if (-not $NoBrowser) {
  $openScript = {
    param($TargetUrl)

    for ($attempt = 0; $attempt -lt 90; $attempt++) {
      try {
        Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
        Start-Process $TargetUrl
        return
      } catch {
        Start-Sleep -Seconds 1
      }
    }
  }

  Start-Job -ScriptBlock $openScript -ArgumentList $url | Out-Null
}

Write-Step "Starting Pachimanga at $url"
Write-Host "Press Ctrl+C to stop the local development server."
Write-Host "Optional flags: -Verify, -Install, -NoBrowser, -Port <number>"
Write-Host ""

& npm run dev -- --port $Port
exit $LASTEXITCODE
