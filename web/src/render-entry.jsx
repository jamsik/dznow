import { createRoot } from "react-dom/client";
import StoryCanvas from "./templates/StoryCanvas";
import { BrandContext } from "./lib/brandContext";
import { DEFAULT_PROFILE, brandFrom } from "./data/brand";
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

/**
 * Ждём картинки, а не только шрифты.
 *
 * Пока планировка и фон приезжали строкой base64, они успевали
 * декодироваться сами собой. Теперь это ссылки на /files/... — их надо
 * честно дождаться, иначе воркер снимет кадр с пустой рамкой вместо
 * чертежа и отдаст такой файл как готовый.
 */
function imagesReady() {
  const imgs = Array.from(document.images);
  return Promise.all(imgs.map(img => (
    img.complete && img.naturalWidth
      ? null
      : new Promise(r => { img.onload = r; img.onerror = r; })
  )));
}

// Замеряем шрифты и картинки по отдельности: когда рендер занимает
// секунды, нужно знать, чьи именно это секунды. Воркер читает это
// после готовности и пишет в лог контейнера.
const t0 = performance.now();
window.__DZNOW_TIMING = {};
const mark = k => () => { window.__DZNOW_TIMING[k] = Math.round(performance.now() - t0); };

const fonts = (document.fonts?.ready || Promise.resolve()).then(mark("fonts"), mark("fonts"));

// Два кадра: первый отдаёт React разметку, во втором в DOM уже есть <img>,
// которые можно дождаться.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const images = imagesReady().then(mark("images"), mark("images"));
  Promise.all([fonts, images])
    .then(() => setTimeout(done, 60))
    .catch(() => setTimeout(done, 60));
}));

// Страховка: что-то не догрузилось — лучше снять кадр, чем висеть до таймаута.
setTimeout(done, 12000);
