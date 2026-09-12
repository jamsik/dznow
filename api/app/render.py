"""Серверный рендер макета.

Идея: тот же React-компонент, что рисует превью в приложении, открывается
в headless-Chromium на странице render.html и снимается скриншотом 1080×1920.
Поэтому «в приложении было одно, а в файле другое» невозможно.

Почему синхронный Playwright в отдельном потоке, а не async:
на Windows uvicorn поднимает SelectorEventLoop, который не умеет
create_subprocess_exec — асинхронный Playwright падает на старте с
NotImplementedError. Отдельный поток снимает проблему целиком и
заодно даёт то, что всё равно понадобится дальше: очередь заданий.

Сейчас поток один и задания идут по очереди. Когда появится MP4,
это место меняется на Redis + несколько воркеров.
"""
import asyncio
import json
import queue
import threading
import time
from concurrent.futures import Future

from playwright.sync_api import sync_playwright

from .config import CHROMIUM_NO_SANDBOX, FILES_DIR, RENDER_URL

VIEWPORT = {"width": 1080, "height": 1920}
JOB_TIMEOUT = 90          # сколько ждём один макет, секунды
_jobs: "queue.Queue" = queue.Queue()
_worker: "threading.Thread | None" = None
_lock = threading.Lock()


def _shoot(browser, payload: dict) -> str:
    page = browser.new_page(viewport=VIEWPORT, device_scale_factor=1)
    try:
        # Данные кладём в страницу скриптом, а не в адресную строку.
        # В payload лежат картинки в base64: планировка и логотип. В URL это
        # мегабайты, и дев-сервер отвечал 431 «request header fields too large»,
        # а рендер падал с 500.
        page.add_init_script(
            "window.__DZNOW_PAYLOAD = " + json.dumps(payload, ensure_ascii=False) + ";"
        )
        page.goto(RENDER_URL, wait_until="load", timeout=30000)
        # страница сама сообщает, что шрифты загружены и разметка отрисована
        page.wait_for_function("window.__DZNOW_READY === true", timeout=15000)
        name = f"dznow_{int(time.time() * 1000)}.png"
        page.screenshot(path=str(FILES_DIR / name), type="png")
        return name
    finally:
        page.close()


def _fail_pending(exc: BaseException) -> None:
    """Не оставляем запросы висеть, если браузер вообще не поднялся."""
    while True:
        try:
            _, fut = _jobs.get_nowait()
        except queue.Empty:
            return
        if fut is not None and not fut.done():
            fut.set_exception(exc)


def _run_worker() -> None:
    try:
        with sync_playwright() as p:
            args = ["--font-render-hinting=none"]
            if CHROMIUM_NO_SANDBOX:
                args += ["--no-sandbox", "--disable-dev-shm-usage"]
            browser = p.chromium.launch(args=args)
            try:
                while True:
                    payload, fut = _jobs.get()
                    if payload is None:          # сигнал на остановку
                        return
                    if not fut.set_running_or_notify_cancel():
                        continue
                    try:
                        fut.set_result(_shoot(browser, payload))
                    except BaseException as exc:  # один плохой макет не роняет воркер
                        fut.set_exception(exc)
            finally:
                browser.close()
    except BaseException as exc:
        # Chromium не установлен, нет прав, кончилась память — что угодно.
        # Отдаём ошибку тем, кто уже ждёт; следующий запрос поднимет поток заново.
        _fail_pending(exc)


def _ensure_worker() -> None:
    global _worker
    with _lock:
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_run_worker, name="dznow-render", daemon=True)
            _worker.start()


async def render_png(payload: dict) -> str:
    """Ставит макет в очередь и ждёт имя готового файла в FILES_DIR."""
    _ensure_worker()
    fut: Future = Future()
    _jobs.put((payload, fut))
    return await asyncio.wait_for(asyncio.wrap_future(fut), timeout=JOB_TIMEOUT)


async def shutdown() -> None:
    global _worker
    if _worker and _worker.is_alive():
        _jobs.put((None, None))
        _worker.join(timeout=5)
    _worker = None
