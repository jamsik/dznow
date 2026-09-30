"""Look up a private chat profile using this app's Telegram bot."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import BOT_TOKEN


def lookup(user_id: int) -> tuple[str, str] | None:
    if not BOT_TOKEN or user_id <= 0:
        return None
    request = Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/getChat",
        data=json.dumps({"chat_id": user_id}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError):
        return None
    chat = payload.get("result") if payload.get("ok") else None
    if not isinstance(chat, dict) or chat.get("type") != "private" or chat.get("id") != user_id:
        return None
    name = " ".join(part for part in (chat.get("first_name"), chat.get("last_name")) if isinstance(part, str)).strip()
    username = chat.get("username") if isinstance(chat.get("username"), str) else ""
    if not name and not username:
        return None
    return name, username
