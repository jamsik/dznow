#!/usr/bin/env bash
# Локальный запуск API. Перед первым разом:
#   pip install -r requirements.txt
#   python -m playwright install chromium
set -a; [ -f .env ] && . ./.env; set +a
exec python -m uvicorn app.main:app --host "${API_HOST:-127.0.0.1}" --port "${API_PORT:-8010}" --reload
