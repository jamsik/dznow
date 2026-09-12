<#
  DZNOW · локальный запуск в один клик.

  Что делает:
    1. проверяет, что есть node / npm / python;
    2. при первом запуске ставит зависимости фронта и создаёт web\.env;
    3. открывает два окна — фронт (Vite) и API (uvicorn);
    4. ждёт, пока порты реально ответят, и открывает браузер.

  Повторный запуск ничего не дублирует: занятый порт считается уже
  поднятым сервисом, окно для него не открывается.

  Запускается через «Запустить DZNOW.bat» в корне проекта.
#>

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$web  = Join-Path $root "web"
$api  = Join-Path $root "api"

$WEB_PORT = 5173
$API_PORT = 8010
$URL      = "http://127.0.0.1:$WEB_PORT/"

function Say($text, $color = "Gray") { Write-Host $text -ForegroundColor $color }

function Fail($text) {
  Write-Host ""
  Write-Host "  $text" -ForegroundColor Red
  Write-Host ""
  Read-Host "  Enter — закрыть" | Out-Null
  exit 1
}

function Need($exe, $hint) {
  if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
    Fail "Не нашёл $exe в PATH. $hint"
  }
}

# Порт занят — значит, сервис уже слушает. Быстрее и честнее, чем ждать HTTP.
function Test-Port([int]$port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try { $client.Connect("127.0.0.1", $port); return $true }
  catch { return $false }
  finally { $client.Dispose() }
}

function Wait-Port([int]$port, [string]$label, [int]$seconds) {
  if (Test-Port $port) { Say "  $label готов" Green; return $true }
  Write-Host "  жду $label " -NoNewline
  for ($i = 0; $i -lt $seconds; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Port $port) { Write-Host " готов" -ForegroundColor Green; return $true }
    Write-Host "." -NoNewline
  }
  Write-Host " не дождался" -ForegroundColor Yellow
  return $false
}

# ---------------------------------------------------------------- проверки

Clear-Host
Say ""
Say "  DZNOW — локальный запуск" Cyan
Say "  $root" DarkGray
Say ""

if (-not (Test-Path $web)) { Fail "Не вижу папку web рядом со скриптом. Положите запускатор в корень проекта." }
if (-not (Test-Path $api)) { Fail "Не вижу папку api рядом со скриптом. Положите запускатор в корень проекта." }

Need "node"   "Поставьте Node.js LTS: https://nodejs.org"
Need "npm"    "Он идёт вместе с Node.js — переустановите Node."
Need "python" "Поставьте Python и при установке отметьте «Add python.exe to PATH»."

# ------------------------------------------------------- первый запуск

if (-not (Test-Path (Join-Path $web "node_modules"))) {
  Say "  Первый запуск: ставлю зависимости фронта, это займёт минуту…" Yellow
  Say ""
  Push-Location $web
  & npm install
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Fail "npm install не прошёл — причина в выводе выше." }
  Say ""
}

# Без web\.env фронт не знает про сервер и собирает картинку сам, в браузере.
$envFile = Join-Path $web ".env"
$envSample = Join-Path $web ".env.example"
if ((-not (Test-Path $envFile)) -and (Test-Path $envSample)) {
  Copy-Item $envSample $envFile
  Say "  создал web\.env — фронт будет ходить в API за настоящим PNG" DarkGray
}

# ---------------------------------------------------------------- запуск

# Сначала фронт: рендер-воркер API открывает его страницу, а не наоборот.
if (Test-Port $WEB_PORT) {
  # Порт может держать чужая программа. Тогда strictPort не даст Vite уехать
  # на 5174, но и мы не должны открывать браузер на чужом приложении.
  $mine = $false
  try {
    $page = Invoke-WebRequest -Uri $URL -UseBasicParsing -TimeoutSec 5
    $mine = $page.Content -match "DZNOW"
  } catch { $mine = $false }
  if (-not $mine) {
    Fail "Порт $WEB_PORT занят чужой программой. Закройте её и запустите снова."
  }
  Say "  фронт уже поднят на $WEB_PORT — оставляю как есть" DarkGray
} else {
  Start-Process "cmd.exe" -ArgumentList "/k title DZNOW WEB :$WEB_PORT && npm run dev" -WorkingDirectory $web
  Say "  открыл окно «DZNOW WEB»"
}

if (Test-Port $API_PORT) {
  Say "  порт $API_PORT уже занят — считаю, что API поднят" DarkGray
} else {
  Start-Process "cmd.exe" -ArgumentList "/k title DZNOW API :$API_PORT && run.bat" -WorkingDirectory $api
  Say "  открыл окно «DZNOW API»"
}

Say ""
$webUp = Wait-Port $WEB_PORT "фронт" 90
$apiUp = Wait-Port $API_PORT "API"   60

# ---------------------------------------------------------------- итог

Say ""
if (-not $webUp) {
  Fail "Фронт не поднялся. Ошибка — в окне «DZNOW WEB»; частая причина: порт $WEB_PORT занят другой программой."
}

Start-Process $URL
Say "  Открыл $URL" Green

if (-not $apiUp) {
  Say ""
  Say "  API не ответил. Приложение работает, но картинку соберёт браузер," Yellow
  Say "  а не сервер — качество то же, но без очереди и истории на сервере." Yellow
  Say "  Ошибка — в окне «DZNOW API». Обычно не хватает одного из двух:" DarkGray
  Say "      pip install -r requirements.txt" DarkGray
  Say "      python -m playwright install chromium" DarkGray
}

Say ""
Say "  Остановить: закрыть окна «DZNOW WEB» и «DZNOW API»." DarkGray
Say ""
Start-Sleep -Seconds 4
