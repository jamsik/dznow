"""Small, password-protected administration UI and its JSON API."""
import base64
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, Header, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import db
from . import layout_settings
from .telegram_profile import lookup
from .templates import TEMPLATE_LAYOUTS, font_path

router = APIRouter(prefix="/dzadmin")
COOKIE = "dzadmin_session"
SESSION_SECONDS = 8 * 60 * 60
_failures: dict[str, list[float]] = defaultdict(list)


def _credentials() -> tuple[str, bytes]:
    password = os.environ.get("DZADMIN_PASSWORD", "")
    secret = os.environ.get("DZADMIN_SESSION_SECRET", "")
    if len(password) < 12 or len(secret) < 32:
        raise HTTPException(status_code=503, detail="Задайте DZADMIN_PASSWORD и DZADMIN_SESSION_SECRET на сервере")
    return password, secret.encode()


def _signature(secret: bytes, value: str) -> str:
    return hmac.new(secret, value.encode(), hashlib.sha256).hexdigest()


def _make_session(secret: bytes) -> str:
    value = f"{int(time.time()) + SESSION_SECONDS}:{secrets.token_urlsafe(18)}"
    encoded = base64.urlsafe_b64encode(value.encode()).decode().rstrip("=")
    return f"{encoded}.{_signature(secret, encoded)}"


def _session_nonce(request: Request) -> str | None:
    try:
        _, secret = _credentials()
        encoded, signature = request.cookies.get(COOKIE, "").split(".", 1)
        if not hmac.compare_digest(signature, _signature(secret, encoded)):
            return None
        value = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode()
        expiry, nonce = value.split(":", 1)
        if int(expiry) <= time.time():
            return None
        return nonce
    except (ValueError, UnicodeDecodeError, HTTPException):
        return None


def _require_admin(request: Request, csrf: str | None = None) -> str:
    nonce = _session_nonce(request)
    if not nonce:
        raise HTTPException(status_code=401, detail="Войдите в админку")
    if csrf is not None:
        _, secret = _credentials()
        if not hmac.compare_digest(csrf, _signature(secret, f"csrf:{nonce}")):
            raise HTTPException(status_code=403, detail="Сессия устарела. Обновите страницу")
    return nonce


def _same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if not origin:
        return
    source = urlsplit(origin).netloc.lower()
    host = request.headers.get("host", "").lower()
    local_preview = source in {"127.0.0.1:5173", "localhost:5173"} and host in {
        "127.0.0.1:8010", "localhost:8010"
    }
    if source != host and not local_preview:
        raise HTTPException(status_code=403, detail="Запрос с другого сайта запрещён")


def _require_write(request: Request, csrf: str) -> None:
    _same_origin(request)
    _require_admin(request, csrf)


class Login(BaseModel):
    password: str


class NewUser(BaseModel):
    id: int = Field(gt=0, le=9223372036854775807)
    name: str = Field(default="", max_length=120)


class Toggle(BaseModel):
    enabled: bool


class TemplateLayout(BaseModel):
    offsets: dict


@router.get("/api/template-layout")
def get_template_layout(request: Request, response: Response):
    _require_admin(request)
    response.headers["Cache-Control"] = "no-store"
    return {"offsets": layout_settings.current()}


@router.put("/api/template-layout")
def put_template_layout(payload: TemplateLayout, request: Request, x_admin_csrf: str = Header("")):
    _require_write(request, x_admin_csrf)
    try:
        offsets = layout_settings.save(payload.offsets)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"offsets": offsets}


@router.get("/api/fonts/{weight}")
def admin_font(weight: str, request: Request):
    _require_admin(request)
    return FileResponse(font_path(weight), media_type="font/woff2", headers={"Cache-Control": "private, no-store"})


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
def page():
    nonce = secrets.token_urlsafe(16)
    html = Path(__file__).with_name("dzadmin.html").read_text(encoding="utf-8")
    response = HTMLResponse(html.replace("__CSP_NONCE__", nonce))
    response.headers["Content-Security-Policy"] = (
        f"default-src 'none'; script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'; "
        "connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@router.get("/api/session")
def session(request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        _, secret = _credentials()
    except HTTPException:
        return {"configured": False, "logged_in": False}
    nonce = _session_nonce(request)
    return {"configured": True, "logged_in": bool(nonce),
            "csrf": _signature(secret, f"csrf:{nonce}") if nonce else None}


@router.post("/api/login")
def login(payload: Login, request: Request):
    _same_origin(request)
    password, secret = _credentials()
    address = request.client.host if request.client else "unknown"
    now = time.monotonic()
    attempts = [when for when in _failures[address] if now - when < 600]
    _failures[address] = attempts
    if len(attempts) >= 8:
        raise HTTPException(status_code=429, detail="Слишком много попыток. Подождите 10 минут")
    if not hmac.compare_digest(payload.password, password):
        attempts.append(now)
        raise HTTPException(status_code=401, detail="Неверный пароль")
    _failures.pop(address, None)
    response = HTMLResponse(content="{}", media_type="application/json")
    response.set_cookie(
        COOKIE, _make_session(secret), max_age=SESSION_SECONDS, path="/dzadmin",
        httponly=True, samesite="strict",
        secure=request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.post("/api/logout")
def logout(request: Request, x_admin_csrf: str = Header("")):
    _require_write(request, x_admin_csrf)
    response = HTMLResponse(content="{}", media_type="application/json")
    response.delete_cookie(COOKIE, path="/dzadmin")
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/api/users")
def users(request: Request, response: Response):
    _require_admin(request)
    response.headers["Cache-Control"] = "no-store"
    return {"users": db.list_users(), "templates": [
        {"id": "object", "title": "Карточка объекта"},
        {"id": "figure", "title": "Крупная цифра"},
        {"id": "light", "title": "Светлая карточка"},
        {"id": "samolet", "title": "Самолет"},
        {"id": "samolet_context", "title": "Самолет · контекст"},
        {"id": "feature", "title": "Поучительная фича"},
    ]}


@router.post("/api/users")
def create_user(payload: NewUser, request: Request, x_admin_csrf: str = Header("")):
    _require_write(request, x_admin_csrf)
    db.add_user(payload.id, payload.name)
    profile = lookup(payload.id)
    if profile:
        db.set_telegram_profile(payload.id, *profile)
    return {"ok": True, "profile_found": bool(profile)}


@router.post("/api/users/{user_id}/lookup")
def lookup_user(user_id: int, request: Request, x_admin_csrf: str = Header("")):
    _require_write(request, x_admin_csrf)
    if user_id <= 0 or not any(user["id"] == user_id for user in db.list_users()):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    profile = lookup(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Telegram не вернул имя. Попросите пользователя открыть бота или приложение")
    db.set_telegram_profile(user_id, *profile)
    return {"ok": True}


@router.put("/api/users/{user_id}/service")
def update_service(user_id: int, payload: Toggle, request: Request, x_admin_csrf: str = Header("")):
    _require_write(request, x_admin_csrf)
    if user_id <= 0 or not db.set_service_access(user_id, payload.enabled):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"ok": True}


@router.put("/api/users/{user_id}/templates/{template_id}")
def update_template(user_id: int, template_id: str, payload: Toggle, request: Request,
                    x_admin_csrf: str = Header("")):
    _require_write(request, x_admin_csrf)
    if template_id not in TEMPLATE_LAYOUTS:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    if user_id <= 0 or not db.set_template_access(user_id, template_id, payload.enabled):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"ok": True}
