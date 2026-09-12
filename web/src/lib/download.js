import { tg } from "./telegram";
import { logError, logInfo } from "./log";

/**
 * Сохранить готовый макет.
 *
 * Раньше здесь было window.open(url) — в Telegram это открывало картинку
 * отдельной вкладкой браузера, и человек оставался с открытой страницей
 * вместо файла в галерее.
 *
 * Теперь три пути, по убыванию «правильности»:
 * На телефоне и на компьютере правильный путь разный, поэтому порядок
 * попыток свой для каждого:
 *
 *   телефон   — системное «Поделиться» с готовым файлом (в меню есть
 *               «Сохранить изображение», картинка идёт в галерею), затем
 *               окно Telegram, затем открыть картинку;
 *   компьютер — тихое скачивание в загрузки без единого окна, затем
 *               Telegram, затем открыть.
 *
 * Одно подтверждение на телефоне неизбежно: ни одна веб-страница не может
 * писать в галерею молча — так устроены и iOS, и Android. Мы можем только
 * выбрать, чьё это будет окно: системное меню «Поделиться» короче и
 * понятнее, чем «Скачать файл?» от Telegram.
 *
 * Возвращает, каким путём пошло: shared · file · telegram · opened · cancelled.
 */
const isPhone = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

async function asBlob(absolute) {
  if (absolute.startsWith("data:")) {
    const [head, body] = absolute.split(",");
    const type = (head.match(/data:([^;]+)/) || [])[1] || "image/png";
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  const res = await fetch(absolute);
  if (!res.ok) throw new Error(`файл не отдался: ${res.status}`);
  return res.blob();
}

export async function saveImage(url, fileName) {
  const absolute = url.startsWith("http") || url.startsWith("data:")
    ? url
    : new URL(url, location.origin).href;

  const order = isPhone()
    ? [viaShare, viaTelegram, viaDownload]
    : [viaDownload, viaTelegram];

  for (const step of order) {
    const how = await step(absolute, fileName);
    if (how) return how;
  }

  window.open(absolute, "_blank", "noopener");
  return "opened";
}

/** Системное меню «Поделиться» с файлом. Оттуда — прямо в галерею. */
async function viaShare(absolute, fileName) {
  if (!navigator.canShare) return null;
  try {
    const blob = await asBlob(absolute);
    const file = new File([blob], fileName, { type: blob.type || "image/png" });
    if (!navigator.canShare({ files: [file] })) return null;
    await navigator.share({ files: [file] });
    logInfo("отдано в системное «Поделиться»", fileName);
    return "shared";
  } catch (err) {
    // Человек закрыл меню — это не ошибка и не повод пробовать дальше.
    if (err?.name === "AbortError") return "cancelled";
    logError("системное «Поделиться» не сработало", err?.message);
    return null;
  }
}

/**
 * Тихое скачивание. Blob нужен именно для того, чтобы у ссылки сработал
 * download: на кросс-адресной ссылке браузер его игнорирует и просто
 * переходит по ней, открывая картинку вкладкой.
 */
async function viaDownload(absolute, fileName) {
  try {
    const blob = await asBlob(absolute);
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60000);
    logInfo("файл сохранён", fileName);
    return "file";
  } catch (err) {
    logError("скачать файл не удалось", err?.message);
    return null;
  }
}

/** Средство Telegram. Своё окно «Скачать файл?» — обойти его нельзя. */
function viaTelegram(absolute, fileName) {
  const app = tg();
  if (!app?.downloadFile || absolute.startsWith("data:")) return null;
  try {
    app.downloadFile({ url: absolute, file_name: fileName });
    logInfo("сохранение через Telegram", fileName);
    return "telegram";
  } catch (err) {
    logError("Telegram не взял файл", err?.message);
    return null;
  }
}
