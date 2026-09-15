# DZNOW: один образ — API, рендер-воркер с Chromium и собранный фронт.
#
# Почему всё вместе, а не отдельный контейнер под статику: рендер-воквер
# открывает render.html в браузере и снимает скриншот. Когда фронт раздаёт
# тот же процесс, воркер ходит на 127.0.0.1 внутри контейнера — не нужен
# ни второй сервис, ни лишний порт наружу, ни синхронизация версий между
# «тем, что видит человек» и «тем, что попадает в файл».

# ---------- 1. сборка фронта ------------------------------------------
FROM node:20-slim AS web
WORKDIR /web

COPY web/package.json web/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY web/ ./

# Шрифты внутрь образа. После этого рендер на сервере не ходит за ними
# в Google — а это была решающая задержка в кадре: каждый макет ждал
# fonts.gstatic.com по сети из серверной стойки.
# Сеть на сборке недоступна — скрипт молча сдаётся, остаётся прежний
# путь через Google. Образ собирается в любом случае.
RUN node scripts/fetch-fonts.mjs

# Штамп сборки. Без него «обновление не видно» превращается в перебор
# догадок: не собралось? не доехало? кеш? А так дата сборки видна в
# приложении на экране «Профиль», и первый же взгляд отвечает на вопрос.
RUN printf 'VITE_BUILD=%s\n' "$(date -u '+%d.%m.%Y %H:%M')" >> .env.production

# VITE_* читаются на сборке и зашиваются в бандл: поменять их потом,
# не пересобрав образ, нельзя. Отсюда args, а не environment в compose.
ARG VITE_API_BASE=/api
ARG VITE_BOT_USERNAME=
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME
RUN npm run build

# ---------- 2. рантайм ------------------------------------------------
FROM python:3.12-slim AS app
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /srv

COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
 && playwright install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/*

COPY api/ /srv/api/
COPY --from=web /web/dist /srv/web/dist

# Chromium под root не поднимает песочницу, а в контейнере мы root.
# Флаг включается здесь осознанно и только для контейнера — локально
# на Windows песочница работает и остаётся включённой.
ENV DATA_DIR=/data \
    RENDER_URL=http://127.0.0.1:8010/render.html \
    CHROMIUM_NO_SANDBOX=1

WORKDIR /srv/api
EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8010/api/health',timeout=4).status==200 else 1)"

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
