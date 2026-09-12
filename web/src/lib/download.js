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
 *   1. Telegram 8.0+ — downloadFile: нативное окно «Сохранить», картинка
 *      уходит в галерею телефона или в загрузки на компьютере;
 *   2. обычный браузер — скачиваем в blob и отдаём ссылкой с download,
 *      файл падает в загрузки, вкладка не открывается;
 *   3. если и это не вышло (старый вебвью) — открываем картинку, чтобы
 *      её можно было сохранить долгим нажатием.
 *
 * Возвращает, каким путём пошло: telegram · file · opened.
 */
export async function saveImage(url, fileName) {
  const app = tg();
  const absolute = url.startsWith("http") || url.startsWith("data:")
    ? url
    : new URL(url, location.origin).href;

  // 1. Нативное сохранение Telegram. data: он не принимает — только ссылку.
  if (app?.downloadFile && !absolute.startsWith("data:")) {
    try {
      app.downloadFile({ url: absolute, file_name: fileName });
      logInfo("сохранение через Telegram", fileName);
      return "telegram";
    } catch (err) {
      logError("Telegram не взял файл, сохраняю сам", err?.message);
    }
  }

  // 2. Обычное скачивание. Blob нужен именно для того, чтобы у ссылки
  //    сработал download: на кросс-адресной ссылке браузер его игнорирует
  //    и просто переходит по ней.
  try {
    let href = absolute;
    let revoke = null;
    if (!absolute.startsWith("data:")) {
      const res = await fetch(absolute);
      if (!res.ok) throw new Error(`файл не отдался: ${res.status}`);
      const blob = await res.blob();
      href = URL.createObjectURL(blob);
      revoke = href;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(revoke), 60000);
    logInfo("файл сохранён", fileName);
    return "file";
  } catch (err) {
    logError("скачать файл не удалось", err?.message);
  }

  // 3. Последнее средство.
  window.open(absolute, "_blank", "noopener");
  return "opened";
}
