import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent

# .env читает само приложение — не нужно ни экспортировать переменные в оболочке,
# ни помнить разницу между cmd, PowerShell и bash.
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
except ImportError:
    pass

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")

# Без токена бота подпись initData проверить нечем, поэтому в этом режиме
# пускаем анонимного пользователя — иначе локально нельзя даже открыть приложение.
# Как только BOT_TOKEN появился, анонимный вход выключается сам.
ALLOW_DEV_NO_AUTH = os.environ.get("ALLOW_DEV_NO_AUTH", "0" if BOT_TOKEN else "1") == "1"

RENDER_URL = os.environ.get("RENDER_URL", "http://127.0.0.1:5173/render.html")
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT_DIR / "data")).resolve()
FILES_DIR = DATA_DIR / "files"
DB_PATH = DATA_DIR / "dznow.db"

# Собранный фронт. В деве его нет — там работает Vite на :5173, и приложение
# раздаёт только API. В контейнере `npm run build` кладёт файлы сюда, и тот же
# процесс отдаёт и приложение, и render.html, который снимает рендер-воркер.
# Один сервис вместо двух: снаружи нужен ровно один порт.
DIST_DIR = Path(os.environ.get("DIST_DIR", ROOT_DIR.parent / "web" / "dist"))

# Chromium под root (а в контейнере мы именно root) отказывается запускать
# песочницу. Отключаем её только там, где это осознанный выбор, а не везде.
CHROMIUM_NO_SANDBOX = os.environ.get("CHROMIUM_NO_SANDBOX", "0") == "1"

FILES_DIR.mkdir(parents=True, exist_ok=True)
