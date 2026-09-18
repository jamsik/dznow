import asyncio
import contextlib
import hashlib
import mimetypes
import shutil
import time

from fastapi import FastAPI, Header, HTTPException, Request
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
FILE_CLEANUP_INTERVAL = 6 * 60 * 60
RENDER_MAX_AGE = 7 * 24 * 60 * 60
UPLOAD_MAX_AGE = 60 * 24 * 60 * 60
_cleanup_task: asyncio.Task | None = None


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


def cleanup_files(now: float | None = None) -> int:
    """Delete expired generated files, leaving unknown files untouched."""
    cutoff = time.time() if now is None else now
    removed = 0
    for path in FILES_DIR.iterdir():
        if not path.is_file():
            continue
        max_age = UPLOAD_MAX_AGE if path.name.startswith("u_") else (
            RENDER_MAX_AGE if path.name.startswith("dznow_") and path.suffix == ".png" else None
        )
        if max_age is None:
            continue
        try:
            if cutoff - path.stat().st_mtime > max_age:
                path.unlink()
                removed += 1
        except FileNotFoundError:
            pass
    return removed


async def cleanup_files_periodically():
    while True:
        await asyncio.sleep(FILE_CLEANUP_INTERVAL)
        removed = await asyncio.to_thread(cleanup_files)
        if removed:
            print(f"[dznow] удалено старых файлов: {removed}", flush=True)


@app.on_event("startup")
async def _startup():
    global _cleanup_task
    db.init()
    removed = await asyncio.to_thread(cleanup_files)
    if removed:
        print(f"[dznow] удалено старых файлов при запуске: {removed}", flush=True)
    _cleanup_task = asyncio.create_task(cleanup_files_periodically())


@app.on_event("shutdown")
async def _shutdown():
    if _cleanup_task:
        _cleanup_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _cleanup_task
    await shutdown()


@app.get("/api/health")
def health():
    disk = shutil.disk_usage(DATA_DIR)
    files = sum(1 for path in FILES_DIR.iterdir() if path.is_file())
    return {
        "ok": True,
        "disk_free_mb": round(disk.free / 1024 / 1024),
        "disk_used_pct": round((disk.used / disk.total) * 100, 1),
        "files": files,
    }


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
    started = time.monotonic()
    try:
        name = await render_png(payload)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Рендер не уложился в отведённое время")
    except RuntimeError as exc:
        # Очередь переполнена. Это не поломка, а защита: рендеры идут по
        # одному, и копить их без предела на маленькой машине — верный
        # способ упереться в память и утащить за собой весь сервер.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        # Самое частое: не установлен Chromium (python -m playwright install chromium)
        # или RENDER_URL не отвечает, потому что не запущен фронтенд.
        raise HTTPException(status_code=500, detail=f"Рендер не удался: {exc}") from exc
    ms = int((time.monotonic() - started) * 1000)
    print(f"[dznow] рендер {name} за {ms} мс", flush=True)
    return {"url": f"/files/{name}", "format": "png", "ms": ms}


# Что принимаем на загрузку. Список закрытый: сюда попадает то, что потом
# открывает Chromium в рендере, и «любой файл» тут не нужен.
UPLOAD_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_UPLOAD = 8 * 1024 * 1024


@app.post("/api/upload")
async def upload(request: Request, x_telegram_init_data: str = Header("")):
    """
    Картинка кладётся на сервер один раз и дальше живёт ссылкой.

    Раньше планировка и фон ехали в теле каждого запроса строкой base64:
    в /api/projects, потом в /api/render, потом той же строкой впрыскивались
    в страницу рендера. Пара картинок превращалась в мегабайты, которые
    трижды гонялись по сети и по CDP, — отсюда и «создание длится вечно».

    Имя файла — хеш содержимого: та же картинка не сохраняется дважды,
    а повторный рендер того же макета вообще ничего не загружает.
    """
    current_user(x_telegram_init_data)

    ctype = (request.headers.get("content-type") or "").split(";")[0].strip()
    ext = UPLOAD_TYPES.get(ctype)
    if not ext:
        raise HTTPException(status_code=415, detail=f"Такие картинки не принимаем: {ctype or 'тип не указан'}")

    blob = await request.body()
    if not blob:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(blob) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Картинка больше 8 МБ")

    name = "u_" + hashlib.sha1(blob).hexdigest()[:20] + ext
    path = FILES_DIR / name
    if not path.exists():
        path.write_bytes(blob)
    return {"url": f"/files/{name}", "bytes": len(blob)}


@app.get("/files/{name}")
def file(name: str):
    path = (FILES_DIR / name).resolve()
    if not str(path).startswith(str(FILES_DIR)) or not path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    media = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    # Имя файла — хеш содержимого, значит содержимое не меняется никогда:
    # можно кешировать надолго. Это экономит загрузку картинки в Chromium
    # при каждом следующем рендере того же макета.
    headers = {"Cache-Control": "public, max-age=31536000, immutable"} if name.startswith("u_") else {}
    return FileResponse(path, media_type=media, headers=headers)


# Собранный фронт раздаётся этим же процессом — и приложение, и render.html,
# который открывает рендер-воркер. Монтируется последним: маршруты выше уже
# объявлены, поэтому /api и /files до статики не доходят.
# В деве каталога нет и блок просто не выполняется: там раздаёт Vite.
if DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="web")
