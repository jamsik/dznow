import { initDataRaw } from "./telegram";
import { logError, logInfo } from "./log";
import { BASE_DRAFT } from "../data/catalog";

/**
 * Единственное место, которое знает про сервер.
 * Пока VITE_API_BASE не задан — работает локальный мок на localStorage,
 * приложение при этом полностью кликабельно. Когда бэкенд поднят,
 * достаточно положить VITE_API_BASE=/api в .env — остальной код не меняется.
 */
const BASE = import.meta.env.VITE_API_BASE || "";
export const isMock = !BASE;

const KEY = "dznow.projects.v1";

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
};
const writeLocal = list => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
};

function seed() {
  const now = Date.now();
  return [
    { id: "p1", title: "ЖК «Панорама»", scenario: "object", layout: "card",
      at: now - 5 * 60 * 1000, data: { ...BASE_DRAFT } },
    { id: "p2", title: "ЖК «Никольский парк»", scenario: "figure", layout: "figure",
      at: now - 20 * 60 * 60 * 1000,
      data: { ...BASE_DRAFT, complex: "ЖК «Никольский парк»", rooms: "1-комнатная", area: 38.6,
              price: 5980000, down: 15, rate: 6.4, term: 30, floor: "4 из 9",
              district: "Первомайский", ready: "II кв. 2027", tag: "Взнос от 15%", skin: "accent" } }
  ];
}

/**
 * Один запрос к серверу. Всё проходит здесь, поэтому здесь же и журнал.
 *
 * Раньше ошибка выглядела как «/render: 500» — по такой строке нельзя понять
 * ни что случилось, ни на чьей стороне. Теперь берём detail из ответа FastAPI
 * и кладём в текст ошибки: именно он попадает человеку на экран.
 */
async function call(path, options = {}) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initDataRaw(),
        ...(options.headers || {})
      }
    });
  } catch (err) {
    // сюда попадает обрыв сети и блокировка запроса, а не ответ сервера
    logError(`${path}: сеть недоступна`, err?.message);
    throw new Error("Сервер недоступен: " + (err?.message || "нет соединения"));
  }

  const ms = Date.now() - started;

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.clone().json();
      detail = body?.detail || "";
    } catch {
      try { detail = (await res.text()).slice(0, 200); } catch {}
    }
    logError(`${path}: ${res.status} за ${ms} мс`, detail);
    const looksLikeProxyPage = /^\s*</.test(detail);
    const human = res.status === 401
      ? "Telegram не подтвердил вход. Откройте приложение заново из бота."
      : res.status >= 500 && (looksLikeProxyPage || !detail)
        ? "Сервер не смог обработать запрос — скорее всего, ему не хватило места или памяти. Попробуйте ещё раз чуть позже."
        : detail || `Сервер ответил ${res.status}`;
    const err = new Error(human);
    err.status = res.status;
    throw err;
  }

  logInfo(`${path}: 200 за ${ms} мс`);
  return res.json();
}

export const api = {
  // Профиль и бренд живут на устройстве (lib/profile.js), пока нет сервера.
  async me() {
    if (isMock) return null;
    return call("/me");
  },

  async listProjects() {
    if (isMock) {
      let list = readLocal();
      if (!list) { list = seed(); writeLocal(list); }
      return list;
    }
    return call("/projects");
  },

  async saveProject(project) {
    if (isMock) {
      const list = (readLocal() || seed())
        .filter(p => !(p.title === project.title && p.layout === project.layout));
      const next = [project, ...list].slice(0, 24);
      writeLocal(next);
      return project;
    }
    return call("/projects", { method: "POST", body: JSON.stringify(project) });
  },

  /**
   * Серверный рендер. Возвращает { url, format }.
   * В моке возвращает null — экран результата тогда отдаёт клиентский PNG.
   */
  async render({ data, layout, format, brand }) {
    if (isMock) return null;
    return call("/render", { method: "POST", body: JSON.stringify({ data, layout, format, brand }) });
  }
};
