$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$classificationProcessId = [int]$args[0]
$classificationLog = Join-Path $root "outputs\legacy-calendar-classification-repair-resumed-20260820-172000.log"
$classificationErrors = Join-Path $root "outputs\legacy-calendar-classification-repair-resumed-20260820-172000-errors.log"

while (Get-Process -Id $classificationProcessId -ErrorAction SilentlyContinue) {
  Start-Sleep -Seconds 10
}

if ((Test-Path $classificationErrors) -and (Get-Item $classificationErrors).Length -gt 0) {
  throw "La correction des régions s'est arrêtée avec une erreur ; la réparation des résultats n'est pas lancée."
}
if (-not (Select-String -Path $classificationLog -Pattern '"mode": "write"' -Quiet)) {
  throw "La correction des régions n'a pas confirmé sa fin ; la réparation des résultats n'est pas lancée."
}

Set-Location $root
node tools\repair-legacy-calendar-results.js --input outputs\legacy-calendar-history-corrected-preview.json --write --confirm 664 --delay-ms 1500
if ($LASTEXITCODE -ne 0) { throw "Réparation des résultats arrêtée." }
