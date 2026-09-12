import asyncio

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import db
from .auth import validate
from .config import DIST_DIR, FILES_DIR
from .render import render_png, shutdown

app = FastAPI(title="DZNOW API", version="0.1.0")

# В деве фронт живёт на :5173 и ходит сюда через прокси Vite.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENCY = {"name": "Дом и Ключ", "mark": "ДК", "color": "#1F4B3F"}


class Project(BaseModel):
    id: str
    title: str
    scenario: str
    layout: str
    at: int
    data: dict


class RenderRequest(BaseModel):
    data: dict
    layout: str
    format: str = "png"
    brand: dict | None = None   # подпись и логотип из профиля


def current_user(init_data: str):
    user = validate(init_data)
    if not user:
        raise HTTPException(status_code=401, detail="Требуется вход через Telegram")
    return user


@app.on_event("startup")
def _startup():
    db.init()


@app.on_event("shutdown")
async def _shutdown():
    await shutdown()


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/me")
def me(x_telegram_init_data: str = Header("")):
    user = current_user(x_telegram_init_data)
    # TODO: агентство и тема приезжают из таблицы tenants, когда появится мультитенантность
    return {"user": user, "tenant": AGENCY}


@app.get("/api/projects")
def projects(x_telegram_init_data: str = Header("")):
    user = current_user(x_telegram_init_data)
    return db.list_projects(user["id"])


@app.post("/api/projects")
def create_project(project: Project, x_telegram_init_data: str = Header("")):
    user = current_user(x_telegram_init_data)
    return db.save_project(user["id"], project.model_dump())


@app.post("/api/render")
async def render(req: RenderRequest, x_telegram_init_data: str = Header("")):
    user = current_user(x_telegram_init_data)
    if req.format != "png":
        # MP4 — следующий шаг: покадровый рендер + ffmpeg, поэтому честный 501,
        # клиент показывает объяснение вместо битой кнопки.
        raise HTTPException(status_code=501, detail="Видео пока собирается только в превью")
    # подпись и бренд подставляет сервер, а не клиент: файл должен быть
    # подписан тем, кто его сделал
    # Бренд берём из профиля пользователя. Когда появятся арендаторы,
    # это место начнёт брать тему из таблицы tenants, а не из запроса.
    payload = {
        "data": req.data,
        "layout": req.layout,
        "brand": req.brand or {
            "agency": AGENCY,
            "author": {"name": user["name"], "tel": user.get("tel") or "", "contacts": ""},
        },
    }
    try:
        name = await render_png(payload)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Рендер не уложился в отведённое время")
    except Exception as exc:
        # Самое частое: не установлен Chromium (python -m playwright install chromium)
        # или RENDER_URL не отвечает, потому что не запущен фронтенд.
        raise HTTPException(status_code=500, detail=f"Рендер не удался: {exc}") from exc
    return {"url": f"/files/{name}", "format": "png"}


@app.get("/files/{name}")
def file(name: str):
    path = (FILES_DIR / name).resolve()
    if not str(path).startswith(str(FILES_DIR)) or not path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path, media_type="image/png")


# Собранный фронт раздаётся этим же процессом — и приложение, и render.html,
# который открывает рендер-воркер. Монтируется последним: маршруты выше уже
# объявлены, поэтому /api и /files до статики не доходят.
# В деве каталога нет и блок просто не выполняется: там раздаёт Vite.
if DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="web")
