"""Shared positions for the administrator's Samolet context template."""
from . import db

SAFE = (60, 1020, 250, 1670)
REGIONS = {
    "header": (90, 250, 900, 102),
    "title": (90, 365, 900, 130),
    "price": (90, 510, 900, 82),
    "finance": (90, 605, 900, 86),
    "planHeading": (90, 710, 900, 70),
    "plan": (90, 805, 545, 475),
    "facts": (685, 805, 305, 475),
    "contextHeading": (90, 1315, 545, 70),
    "insight": (90, 1400, 545, 190),
    "amenities": (685, 1310, 305, 340),
    "contact": (90, 1583, 530, 87),
}
SETTING_KEY = "layout_offsets:samolet_context"


def current() -> dict:
    return db.get_json_setting(SETTING_KEY) or {}


def validated(offsets: dict) -> dict:
    if not isinstance(offsets, dict) or len(offsets) > len(REGIONS):
        raise ValueError("Неверный список блоков")
    result = {}
    left, right, top, bottom = SAFE
    for key, point in offsets.items():
        if key not in REGIONS or not isinstance(point, dict) or set(point) != {"x", "y"}:
            raise ValueError("Неизвестный блок или неверные координаты")
        x, y = point["x"], point["y"]
        if type(x) is not int or type(y) is not int:
            raise ValueError("Координаты должны быть целыми числами")
        base_x, base_y, width, height = REGIONS[key]
        x = min(right - base_x - width, max(left - base_x, x))
        y = min(bottom - base_y - height, max(top - base_y, y))
        if x or y:
            result[key] = {"x": x, "y": y}
    return result


def save(offsets: dict) -> dict:
    cleaned = validated(offsets)
    db.set_json_setting(SETTING_KEY, cleaned)
    return cleaned
