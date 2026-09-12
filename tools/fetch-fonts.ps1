# Скачивает woff2 (кириллица + латиница) и раскладывает в web\public\fonts
# под именами, которые ждёт web\src\styles\fonts.css.
#
#   powershell -ExecutionPolicy Bypass -File tools\fetch-fonts.ps1
#
# Источник — google-webfonts-helper: он отдаёт те же файлы, что Google Fonts,
# но уже подрезанные по нужным алфавитам и начертаниям.

$ErrorActionPreference = "Stop"

$families = @(
  @{ id = "onest";              variants = "400,500,600,700,800" },
  @{ id = "unbounded";          variants = "700" },
  @{ id = "cormorant-garamond"; variants = "600" },
  @{ id = "ibm-plex-mono";      variants = "400,500" }
)

$dest = Join-Path $PSScriptRoot "..\web\public\fonts"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

foreach ($f in $families) {
  $url = "https://gwfh.mranftl.com/api/fonts/$($f.id)?download=zip&subsets=cyrillic,latin&formats=woff2&variants=$($f.variants)"
  $zip = Join-Path $env:TEMP "$($f.id).zip"
  $tmp = Join-Path $env:TEMP "$($f.id)-unzip"

  Write-Host "Качаю $($f.id) ($($f.variants))..."
  Invoke-WebRequest -Uri $url -OutFile $zip
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  Expand-Archive -Path $zip -DestinationPath $tmp

  Get-ChildItem $tmp -Filter *.woff2 | ForEach-Object {
    $weight = "400"
    if     ($_.Name -match '-(\d00)\.woff2$') { $weight = $Matches[1] }
    elseif ($_.Name -match 'regular')         { $weight = "400" }
    Copy-Item $_.FullName (Join-Path $dest "$($f.id)-$weight.woff2") -Force
  }

  Remove-Item $zip -Force
  Remove-Item -Recurse -Force $tmp
}

Write-Host ""
Write-Host "Готово. Файлы в web\public\fonts:"
Get-ChildItem $dest | Select-Object Name, @{n="KB";e={[math]::Round($_.Length/1KB)}} | Format-Table
Write-Host "Дальше: раскомментируйте import fonts.css в src\main.jsx и src\render-entry.jsx,"
Write-Host "затем удалите <link> на fonts.googleapis.com в index.html и render.html."
