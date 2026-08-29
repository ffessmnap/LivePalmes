$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

node tools\repair-legacy-calendar-classification.js --before outputs\legacy-calendar-history-preview.json --after outputs\legacy-calendar-history-corrected-preview.json --regions outputs\legacy-calendar-region-resolutions.json --skip 492 --write --confirm 49 --delay-ms 1500
if ($LASTEXITCODE -ne 0) { throw "Correction des régions arrêtée." }

node tools\repair-legacy-calendar-results.js --input outputs\legacy-calendar-history-corrected-preview.json --write --confirm 664 --delay-ms 1500
if ($LASTEXITCODE -ne 0) { throw "Réparation des résultats arrêtée." }
