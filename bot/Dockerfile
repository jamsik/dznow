# Бот-приглашение. Отдельный маленький образ: ему не нужны ни Chromium,
# ни сборка фронта — только сеть до api.telegram.org.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
COPY bot/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY bot/bot.py ./
CMD ["python", "bot.py"]
