#!/usr/bin/env bash
# Забирает адрес, который выдал Cloudflare-туннель, кладёт его в .env
# и перезапускает бота. Адрес меняется при каждом перезапуске туннеля,
# поэтому вручную это пришлось бы делать каждый раз.
set -euo pipefail
cd "$(dirname "$0")/.."

url=""
for _ in $(seq 1 20); do
  url=$(docker compose logs tunnel 2>&1 \
        | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true)
  [ -n "$url" ] && break
  sleep 2
done

if [ -z "$url" ]; then
  echo "Адрес в логах туннеля не появился. Посмотрите: docker compose logs tunnel" >&2
  exit 1
fi

touch .env
if grep -q '^APP_URL=' .env; then
  sed -i "s#^APP_URL=.*#APP_URL=$url#" .env
else
  echo "APP_URL=$url" >> .env
fi

docker compose up -d bot >/dev/null

echo "Адрес приложения: $url"
echo
echo "Вставьте его в @BotFather:  /mybots → ваш бот → Bot Settings →"
echo "Menu Button → Edit menu button URL"
echo "(кнопку в меню бот ставит и сам при старте — это на случай, если не успел)"
