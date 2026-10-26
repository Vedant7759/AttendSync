$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found. Install the current Node.js LTS release, reopen PowerShell, and rerun this script.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm was not found. Reinstall Node.js with npm enabled, reopen PowerShell, and rerun this script.'
}

Write-Host "Node: $(node --version) | npm: $(npm --version)" -ForegroundColor Cyan
$mongod = Get-Command mongod -ErrorAction SilentlyContinue
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if (-not $mongod -and -not $mongoService) {
  Write-Warning 'MongoDB Community Server was not detected. Install it from https://www.mongodb.com/try/download/community before starting the API.'
  Write-Host 'MongoDB Shell is separate and optional for this application. Download it from https://www.mongodb.com/try/download/shell'
} else {
  Write-Host 'MongoDB Server installation detected.' -ForegroundColor Green
}

$envFile = Join-Path $root 'server\.env'
if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root '.env.example') $envFile
  Write-Host 'Created server\.env from the local example configuration.'
}

foreach ($folder in @('server', 'react-teacher', 'angular-admin')) {
  Write-Host "`nInstalling $folder dependencies..." -ForegroundColor Cyan
  npm install --prefix (Join-Path $root $folder)
  if ($LASTEXITCODE -ne 0) { throw "npm install failed in $folder. Review the npm output and retry." }
}

Write-Host "`nDependencies installed. Start MongoDB, then run .\scripts\start-all.ps1 or use the manual commands in README.md." -ForegroundColor Green

