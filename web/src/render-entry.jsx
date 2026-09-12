import { createRoot } from "react-dom/client";
import StoryCanvas from "./templates/StoryCanvas";
import { BrandContext } from "./lib/brandContext";
import { DEFAULT_PROFILE, brandFrom } from "./data/brand";
// Локальные шрифты: раскомментировать после tools\fetch-fonts.ps1
// import "./styles/fonts.css";
import "./styles/story.css";

/**
 * Точка входа серверного рендера. Воркер открывает
 *   /render.html?d=<base64url(JSON)>
 * и снимает узел 1080×1920. Разметка та же, что в приложении, —
 * поэтому превью и файл совпадают пиксель в пиксель.
 *
 * Готовность страницы воркер определяет по window.__DZNOW_READY.
 */
/**
 * Данные приходят от воркера скриптом (window.__DZNOW_PAYLOAD).
 * Через адресную строку их не передать: в payload лежат картинки в base64,
 * URL распухает до мегабайтов, и дев-сервер отвечает 431.
 */
const payload = window.__DZNOW_PAYLOAD || { data: {}, layout: "card" };
if (!window.__DZNOW_PAYLOAD) console.warn("[DZNOW] пустой payload рендера");

const fallback = brandFrom(DEFAULT_PROFILE);
const brand = {
  agency: payload.brand?.agency || fallback.agency,
  author: payload.brand?.author || fallback.author
};

createRoot(document.getElementById("render-root")).render(
  <BrandContext.Provider value={brand}>
    <StoryCanvas data={payload.data} layout={payload.layout} />
  </BrandContext.Provider>
);

const done = () => { window.__DZNOW_READY = true; };
if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(() => setTimeout(done, 60)));
else setTimeout(done, 400);
