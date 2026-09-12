# Запуск API на Windows.
# Первый раз:
#   pip install -r requirements.txt
#   python -m playwright install chromium
#
# Дальше:  .\run.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), "Process")
    }
  }
}

$apiHost = if ($env:API_HOST) { $env:API_HOST } else { "127.0.0.1" }
$apiPort = if ($env:API_PORT) { $env:API_PORT } else { "8010" }

Write-Host "DZNOW API -> http://${apiHost}:${apiPort}  (рендер берёт фронт с $env:RENDER_URL)"
python -m uvicorn app.main:app --host $apiHost --port $apiPort --reload
