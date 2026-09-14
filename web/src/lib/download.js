import { tg } from "./telegram";
import { logError, logInfo } from "./log";

/**
 * Сохранить готовый макет.
 *
 * Путь зависит от того, где мы открыты, и разница принципиальная:
 *
 *   телефон в Telegram — системное «Поделиться» с готовым файлом: в меню
 *       есть «Сохранить изображение», и картинка идёт прямо в галерею;
 *   компьютер в Telegram — downloadFile самого Telegram;
 *   обычный браузер — тихое скачивание в загрузки, без единого окна.
 *
 * Почему в Telegram на компьютере нельзя обычным способом. Скачивание
 * через <a download> держится на blob:-ссылке, а клиент Telegram на маке
 * перехватывает переход и отдаёт такую ссылку системе — macOS не знает,
 * чем открыть «blob:https://…», и показывает «Не указана программа для
 * открытия URL-адреса». Приложение при этом бодро писало «файл сохранён».
 * Поэтому внутри Telegram blob не используем вовсе: там своё средство.
 *
 * Одно подтверждение на телефоне неизбежно: ни одна веб-страница не может
 * писать в галерею молча — так устроены и iOS, и Android. Выбрать можно
 * только, чьё это будет окно: системное меню «Поделиться» короче и
 * понятнее, чем «Скачать файл?» от Telegram.
 *
 * Возвращает, каким путём пошло: shared · file · telegram · opened · cancelled.
 */
const isPhone = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

/** Мы внутри клиента Telegram, а не в обычной вкладке браузера. */
const inTelegram = () => {
  const app = tg();
  return Boolean(app && (app.initData || app.platform && app.platform !== "unknown"));
};

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
    : inTelegram()
      ? [viaTelegram, viaShare]        // blob внутри Telegram ломается, см. шапку
      : [viaDownload];

  for (const step of order) {
    const how = await step(absolute, fileName);
    if (how) return how;
  }

  window.open(absolute, "_blank", "noopener");
  return "opened";
}

/** Системное меню «Поделиться» с файлом. Оттуда — прямо в галерею. */
async function viaShare(absolute, fileName) {
  if (!navigator.canShare || !navigator.share) return null;
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
