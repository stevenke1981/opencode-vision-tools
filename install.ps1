param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host "opencode-vision-tools installer" -ForegroundColor Cyan
node "$PSScriptRoot\scripts\install-global.mjs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "`nDone! Restart OpenCode." -ForegroundColor Green
Write-Host 'Verify: opencode run "call visionDoctor and show the result"' -ForegroundColor White