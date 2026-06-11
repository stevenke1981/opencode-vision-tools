param(
  [switch]$SkipNpm
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$GlobalConfig = Join-Path $env:USERPROFILE ".config"
$InstallDir = Join-Path $GlobalConfig "opencode-vision-tools"
$Repo = "https://github.com/stevenke1981/opencode-vision-tools.git"

Write-Host "opencode-vision-tools global installer" -ForegroundColor Cyan
Write-Host "Install dir: $InstallDir" -ForegroundColor DarkGray

if (-not (Test-Path (Join-Path $InstallDir ".git"))) {
  Write-Host "Cloning to $InstallDir ..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $GlobalConfig | Out-Null
  git clone $Repo $InstallDir
} elseif ($PSScriptRoot -ne $InstallDir) {
  Write-Host "Updating $InstallDir ..." -ForegroundColor Yellow
  Push-Location $InstallDir
  git pull --ff-only
  Pop-Location
}

Set-Location $InstallDir
$args = @("scripts/install-global.mjs")
if ($SkipNpm) { $args += "--skip-npm" }
node @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDone! Restart OpenCode." -ForegroundColor Green
Write-Host 'Verify: opencode run "call visionDoctor and show the result"' -ForegroundColor White