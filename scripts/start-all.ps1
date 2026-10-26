$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

foreach ($tool in @('node', 'npm')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    throw "$tool was not found. Install Node.js and reopen PowerShell."
  }
}
foreach ($folder in @('server\node_modules', 'react-teacher\node_modules', 'angular-admin\node_modules')) {
  if (-not (Test-Path (Join-Path $root $folder))) {
    throw "Dependencies are missing at $folder. Run .\scripts\setup.ps1 first."
  }
}
if (-not (Test-Path (Join-Path $root 'server\.env'))) {
  throw 'server\.env is missing. Run .\scripts\setup.ps1, then verify MONGODB_URI.'
}

$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
$mongod = Get-Command mongod -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne 'Running') {
  throw 'The MongoDB service is installed but stopped. Start it with: Start-Service MongoDB (Administrator PowerShell may be required).'
}
if (-not $mongoService -and -not $mongod) {
  throw 'MongoDB Server is missing. Install MongoDB Community Server, then run .\scripts\setup.ps1 again.'
}

$windows = @(
  @{ Name = 'AttendSync API'; Command = 'npm --prefix .\server run dev' },
  @{ Name = 'AttendSync Teacher Portal'; Command = 'npm --prefix .\react-teacher run dev' },
  @{ Name = 'AttendSync Admin Dashboard'; Command = 'npm --prefix .\angular-admin start' }
)
foreach ($app in $windows) {
  $command = "Set-Location -LiteralPath '$root'; Write-Host '$($app.Name)' -ForegroundColor Cyan; $($app.Command)"
  Start-Process -FilePath 'powershell.exe' -WorkingDirectory $root -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $command)
}
Write-Host 'Opened three PowerShell windows. URLs: API http://localhost:5000, Teacher http://localhost:3000, Admin http://localhost:4200.' -ForegroundColor Green

