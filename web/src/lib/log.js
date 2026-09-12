/**
 * Журнал приложения.
 *
 * Зачем: внутри Telegram консоли нет. На телефоне её не открыть вообще, на
 * десктопе — через отладчик, до которого никто не дойдёт. А ошибки, которые
 * ловились «где-то там», выглядели как «приложение подвисло»: экран сборки
 * досиживал до таймаута и уходил дальше без объяснений.
 *
 * Теперь всё записывается в кольцевой буфер, который видно на экране
 * «Профиль → Журнал» и можно скопировать одной кнопкой. Буфер в памяти:
 * перезагрузили приложение — журнал чистый, и это правильно, иначе он
 * копил бы мусор от прошлых сессий.
 */
const MAX = 200;

const entries = [];
const listeners = new Set();
let seq = 0;

const short = v => {
  if (v === undefined) return undefined;
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s && s.length > 400 ? s.slice(0, 400) + "…" : s;
  } catch {
    return String(v);
  }
};

function push(level, message, detail) {
  entries.push({
    id: ++seq,
    at: Date.now(),
    level,                       // info | warn | error
    message: String(message),
    detail: short(detail)
  });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  listeners.forEach(fn => { try { fn(); } catch {} });
}

export const logInfo = (m, d) => push("info", m, d);
export const logWarn = (m, d) => push("warn", m, d);
export const logError = (m, d) => push("error", m, d);

export const getLog = () => entries.slice().reverse();   // свежие сверху
export const errorCount = () => entries.filter(e => e.level === "error").length;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Журнал одним текстом — чтобы отправить его в чат, а не пересказывать. */
export function logAsText(extra = {}) {
  const head = [
    "DZNOW journal " + new Date().toISOString(),
    "ua: " + navigator.userAgent,
    ...Object.entries(extra).map(([k, v]) => k + ": " + v),
    "—".repeat(30)
  ];
  const body = entries.map(e => {
    const t = new Date(e.at).toISOString().slice(11, 23);
    return `${t} ${e.level.toUpperCase().padEnd(5)} ${e.message}` +
           (e.detail ? "\n      " + e.detail : "");
  });
  return head.concat(body).join("\n");
}

/**
 * Ловим то, что иначе ушло бы только в консоль: необработанные исключения,
 * отвалившиеся промисы и всё, что код пишет через console.error.
 */
export function installLogHooks() {
  if (typeof window === "undefined" || window.__dznowLogHooked) return;
  window.__dznowLogHooked = true;

  window.addEventListener("error", e => {
    push("error", e.message || "Ошибка выполнения",
         e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined);
  });

  window.addEventListener("unhandledrejection", e => {
    const r = e.reason;
    push("error", "Необработанная ошибка: " + (r?.message || r), r?.stack);
  });

  const orig = console.error;
  console.error = (...args) => {
    push("error", args.map(a => (a?.message || a)).join(" "));
    orig.apply(console, args);
  };
}
