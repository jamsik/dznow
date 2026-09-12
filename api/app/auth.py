"""Проверка подписи Telegram initData.

Логика перенесена из рабочего кода gacha-проекта: секрет — HMAC(bot_token, "WebAppData"),
им подписывается отсортированная строка пар ключ=значение без самого hash.
Клиенту доверять нельзя: user_id берётся только отсюда.
"""
import hashlib
import hmac
import json
from urllib.parse import unquote

from .config import ALLOW_DEV_NO_AUTH, BOT_TOKEN

DEV_USER = {"id": 0, "name": "Локальный пользователь", "initials": "ЛП", "tel": None}


def parse_init_data(init_data: str) -> dict:
    pairs = {}
    for chunk in (init_data or "").split("&"):
        if "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        pairs[key] = unquote(value)
    return pairs


def validate(init_data: str):
    """Возвращает dict пользователя или None."""
    if not init_data or not BOT_TOKEN:
        return DEV_USER if ALLOW_DEV_NO_AUTH else None

    pairs = parse_init_data(init_data)
    provided = pairs.pop("hash", None)
    if not provided:
        return None

    check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, provided):
        return None

    try:
        user = json.loads(pairs.get("user", "{}"))
    except json.JSONDecodeError:
        return None
    if not user.get("id"):
        return None

    name = " ".join(filter(None, [user.get("first_name"), user.get("last_name")])) or user.get("username", "")
    initials = "".join(part[0] for part in name.split()[:2]).upper() or "?"
    return {"id": user["id"], "name": name or "Пользователь", "initials": initials, "tel": None}
