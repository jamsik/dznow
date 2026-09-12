import { isMock } from "./api";
import { initDataRaw } from "./telegram";
import { logError, logInfo } from "./log";

/**
 * Картинки макета — на сервер один раз, дальше ссылкой.
 *
 * Пока человек редактирует, планировка и фон живут в браузере как data:URL:
 * превью перерисовывается мгновенно, сеть не трогается вообще. Загрузка
 * происходит один раз, в момент «Создать».
 *
 * Так было не всегда: раньше эти data:URL целиком уезжали в /api/projects,
 * оттуда в /api/render, а оттуда строкой впрыскивались в страницу рендера.
 * Пара картинок превращалась в мегабайты, которые гонялись по кругу трижды —
 * и «готовый дизайн за несколько секунд» занимал минуту.
 *
 * Одна и та же картинка загружается один раз за сессию: адрес запоминается
 * здесь, а на сервере имя файла — хеш содержимого.
 */
const uploaded = new Map();   // data:URL → /files/...

const isData = v => typeof v === "string" && v.startsWith("data:");

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const type = (head.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function uploadOne(dataUrl) {
  const cached = uploaded.get(dataUrl);
  if (cached) return cached;

  const blob = dataUrlToBlob(dataUrl);
  const started = Date.now();

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": blob.type,
      "X-Telegram-Init-Data": initDataRaw()
    },
    body: blob
  });

  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.detail || ""; } catch {}
    throw new Error(detail || `загрузка картинки: ${res.status}`);
  }

  const { url } = await res.json();
  logInfo(`картинка загружена: ${Math.round(blob.size / 1024)} КБ за ${Date.now() - started} мс`, url);
  uploaded.set(dataUrl, url);
  return url;
}

/**
 * Подменяет в данных макета все data:URL на ссылки.
 * Загрузка не удалась — оставляем как было: лучше медленно, чем никак.
 */
export async function materialize(data) {
  if (isMock) return data;               // без сервера грузить некуда

  const out = { ...data };
  const jobs = ["planImage", "bgImage"]
    .filter(k => isData(out[k]))
    .map(async k => {
      try {
        out[k] = await uploadOne(out[k]);
      } catch (err) {
        logError(`не удалось загрузить ${k}, отправляю как есть`, err?.message);
      }
    });

  await Promise.all(jobs);
  return out;
}
