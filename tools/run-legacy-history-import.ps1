$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$preview = Join-Path $root "outputs\legacy-calendar-history-preview.json"
$batches = @(
  @{ From = "2022-09-01"; To = "2024-09-01"; Confirm = 248; Skip = 56 },
  @{ From = "2024-09-01"; To = "2025-09-01"; Confirm = 137 }
)

Set-Location $root
foreach ($batch in $batches) {
  Write-Output "Démarrage $($batch.From) → $($batch.To) : $($batch.Confirm) compétitions"
  $skipArguments = if ($batch.Skip) { @("--skip", $batch.Skip) } else { @() }
  node tools\import-legacy-calendar-to-firestore.js --input $preview --from $batch.From --to $batch.To --batch-size 1 --delay-ms 1500 --write --confirm $batch.Confirm @skipArguments
  if ($LASTEXITCODE -ne 0) { throw "Import arrêté sur le lot $($batch.From) → $($batch.To)." }
  Write-Output "Lot terminé $($batch.From) → $($batch.To)"
}
