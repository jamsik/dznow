"""Template access uses the verified Telegram user, never a request-supplied ID."""
from pathlib import Path

from fastapi import HTTPException

from . import db
from .config import ALLOW_DEV_NO_AUTH, SAMOLET_FONT_DIR

PRIVATE_LAYOUT = "samolet"
TEMPLATE_LAYOUTS = {"object": "card", "figure": "figure", "light": "card",
                    "samolet": "samolet", "samolet_context": "samolet_context"}
FONT_FILES = {
    "400": "CoFo_Sans-Regular.woff2",
    "500": "CoFo_Sans-Medium.woff2",
    "700": "CoFo_Sans-Bold.woff2",
    "900": "CoFo_Sans-Black.woff2",
}


def allowed_templates(user: dict) -> list[str]:
    if user["id"] == 0 and ALLOW_DEV_NO_AUTH:
        return list(TEMPLATE_LAYOUTS)
    return db.user_templates(user["id"])


def require_template(user: dict, template_id: str, layout: str) -> None:
    expected_layout = TEMPLATE_LAYOUTS.get(template_id)
    if expected_layout is None or expected_layout != layout:
        raise HTTPException(status_code=400, detail="Неизвестный шаблон")
    if template_id not in allowed_templates(user):
        raise HTTPException(status_code=403, detail="Этот шаблон вам недоступен")


def font_path(weight: str) -> Path:
    name = FONT_FILES.get(weight)
    if name is None:
        raise HTTPException(status_code=404, detail="Начертание не найдено")
    path = SAMOLET_FONT_DIR / name
    if not path.is_file():
        raise HTTPException(status_code=503, detail="Фирменный шрифт шаблона не установлен на сервере")
    return path
