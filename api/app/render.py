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

# Три числа против нехватки памяти. Chromium на странице 1080×1920 просит
# 300–400 МБ, и на маленькой машине это ровно та величина, после которой
# ядро начинает убивать процессы — а убивает оно не обязательно Chromium.
IDLE_SHUTDOWN = 600       # столько секунд тишины — и браузер закрывается
CONTEXT_RENDERS = 20      # столько макетов на один контекст, потом заново
MAX_QUEUE = 3             # больше в очереди не копим, честно отказываем

# Chromium в контейнере: всё лишнее выключено. Каждая строка здесь — это
# процесс или подсистема, которая иначе съест десятки мегабайт ни за что.
BROWSER_ARGS = [
    "--font-render-hinting=none",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-sync",
    "--disable-translate",
    "--metrics-recording-only",
    "--mute-audio",
    "--no-first-run",
    "--renderer-process-limit=1",
    # Потолок для сборщика мусора в движке: без него V8 разрастается
    # «про запас», ориентируясь на всю память машины.
    "--js-flags=--max-old-space-size=256",
]

_jobs: "queue.Queue" = queue.Queue()
_worker: "threading.Thread | None" = None
_lock = threading.Lock()


def _shoot(context, payload: dict) -> str:
    page = context.new_page()
    try:
        # Данные кладём в страницу скриптом, а не в адресную строку.
        # Картинки теперь ездят ссылками (/files/u_*), но payload всё равно
        # не для URL: там текст макета, бренд и флаги.
        page.add_init_script(
            "window.__DZNOW_PAYLOAD = " + json.dumps(payload, ensure_ascii=False) + ";"
        )

        t0 = time.monotonic()
        # domcontentloaded, а не load: ждать «load» значило ждать, пока
        # догрузится всё до последнего шрифта, — а готовность страница и так
        # объявляет сама, ниже, и объявляет честнее.
        page.goto(RENDER_URL, wait_until="domcontentloaded", timeout=30000)
        t_goto = time.monotonic()

        # страница сама сообщает, что шрифты и картинки на месте
        page.wait_for_function("window.__DZNOW_READY === true", timeout=20000)
        t_ready = time.monotonic()

        name = f"dznow_{int(time.time() * 1000)}.png"
        page.screenshot(path=str(FILES_DIR / name), type="png")
        t_shot = time.monotonic()

        # Страница отдельно замерила, сколько ждала шрифтов и сколько картинок.
        try:
            inner = page.evaluate("window.__DZNOW_TIMING || {}") or {}
        except Exception:
            inner = {}

        ms = lambda a, b: int((b - a) * 1000)
        print(
            f"[dznow] {name}: страница {ms(t0, t_goto)} мс · "
            f"готовность {ms(t_goto, t_ready)} мс "
            f"(шрифты {inner.get('fonts', '?')} мс, картинки {inner.get('images', '?')} мс) · "
            f"снимок {ms(t_ready, t_shot)} мс",
            flush=True,
        )
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
    """
    Браузер живёт ровно столько, сколько нужен.
    
    Один контекст на несколько рендеров подряд — это разница в разы:
    browser.new_page() в Playwright заводит НОВЫЙ контекст, а у каждого
    контекста свой кеш, и на каждый макет Chromium заново скачивал шрифты
    и картинки.
    
    Но у общего контекста есть цена: он не отдаёт память. На машине, где
    всей памяти меньше гигабайта, постоянно висящий Chromium — это тот
    самый кусок, из-за которого ядро начинает убивать процессы, и убивает
    не обязательно виновника: в прошлый раз досталось боту и SSH.
    
    Поэтому память возвращается в двух местах: контекст пересоздаётся
    каждые CONTEXT_RENDERS макетов, а после IDLE_SHUTDOWN секунд тишины
    закрывается весь браузер и поток заканчивается. Следующий запрос
    поднимет всё заново — это пара секунд на холодный старт, и они того
    стоят: ночью, когда никто ничего не делает, DZNOW не занимает ничего.
    """
    browser = None
    context = None
    made = 0
    try:
        with sync_playwright() as p:
            args = list(BROWSER_ARGS)
            if CHROMIUM_NO_SANDBOX:
                args += ["--no-sandbox", "--disable-dev-shm-usage"]

            while True:
                try:
                    payload, fut = _jobs.get(timeout=IDLE_SHUTDOWN)
                except queue.Empty:
                    # Тишина. Проверяем под замком: вдруг прямо сейчас кто-то
                    # кладёт задание — тогда не расходимся.
                    with _lock:
                        if _jobs.empty():
                            print("[dznow] простой — закрываю Chromium", flush=True)
                            return
                    continue

                if payload is None:              # сигнал на остановку
                    return
                if not fut.set_running_or_notify_cancel():
                    continue

                try:
                    if browser is None:
                        browser = p.chromium.launch(args=args)
                        context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
                        made = 0
                    elif made >= CONTEXT_RENDERS:
                        context.close()
                        context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
                        made = 0
                        print("[dznow] контекст пересоздан, память отпущена", flush=True)

                    fut.set_result(_shoot(context, payload))
                    made += 1
                except BaseException as exc:     # один плохой макет не роняет воркер
                    fut.set_exception(exc)
    except BaseException as exc:
        # Chromium не установлен, нет прав, кончилась память — что угодно.
        # Отдаём ошибку тем, кто уже ждёт; следующий запрос поднимет поток заново.
        _fail_pending(exc)
    finally:
        for closer in (context, browser):
            try:
                if closer is not None:
                    closer.close()
            except Exception:
                pass


async def render_png(payload: dict) -> str:
    """Ставит макет в очередь и ждёт имя готового файла в FILES_DIR."""
    # Очередь не резиновая. Рендеры идут по одному, и если желающих больше
    # горстки — честнее отказать сразу, чем держать всех в ожидании, пока
    # у машины кончится память.
    if _jobs.qsize() >= MAX_QUEUE:
        raise RuntimeError("Сейчас собирается несколько макетов подряд, попробуйте через минуту")

    fut: Future = Future()
    # Кладём и поднимаем воркер под одним замком: иначе он мог решить, что
    # работы нет, и закрыться ровно между этими двумя строчками.
    with _lock:
        _jobs.put((payload, fut))
        global _worker
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_run_worker, name="dznow-render", daemon=True)
            _worker.start()

    return await asyncio.wait_for(asyncio.wrap_future(fut), timeout=JOB_TIMEOUT)


async def shutdown() -> None:
    global _worker
    if _worker and _worker.is_alive():
        _jobs.put((None, None))
        _worker.join(timeout=5)
    _worker = None
