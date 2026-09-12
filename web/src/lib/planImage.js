/**
 * Подготовка загруженной планировки.
 *
 * Застройщик отдаёт чертёж чёрным по белому — на тёмном макете это белая
 * заплатка. Здесь картинка превращается в чертёж «фирменным цветом по прозрачному»:
 *   1) яркость пикселя становится непрозрачностью (тёмные линии остаются,
 *      белый фон исчезает);
 *   2) контраст растягивается по гистограмме, чтобы серость JPEG не давала дымку;
 *   3) все линии перекрашиваются в цвет варианта оформления;
 *   4) пустые поля обрезаются по границам непрозрачного.
 *
 * Работает на обычных чертежах. На цветных 3D-планах с мебелью осмысленного
 * результата не будет — для них в загрузчике есть режим «как есть».
 */

import { logInfo } from "./log";

const MAX_SIDE = 1200;   // больше в сторис всё равно не видно, а вес растёт
const NOISE = 0.10;      // ниже этого уровня считаем, что это фон, а не линия

/**
 * Кодируем в WebP: чертёж с прозрачностью в PNG весил по 1–3 МБ, и именно
 * эти мегабайты потом ехали на сервер и в браузер Chromium. WebP с альфой
 * даёт ту же картинку в 5–10 раз легче.
 *
 * Старые вебвью WebP из canvas не умеют — там toDataURL молча возвращает
 * PNG. Проверяем префикс и не притворяемся, что всё получилось.
 */
function encode(canvas, alpha) {
  const webp = canvas.toDataURL("image/webp", alpha ? 0.92 : 0.86);
  if (webp.startsWith("data:image/webp")) return webp;
  return alpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
}

const kb = url => Math.round(url.length * 0.75 / 1024);

/**
 * Уменьшает картинку до разумного размера, ничего не перекрашивая.
 * Нужна для режима «как есть»: снимок с телефона может весить мегабайты,
 * а он потом уезжает на сервер в теле запроса и ложится в базу.
 */
export function fitImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      if (scale === 1 && dataUrl.length < 600 * 1024) { resolve(dataUrl); return; }
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const started = Date.now();
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const out = encode(c, false);
      logInfo(`картинка ужата: ${img.width}×${img.height} → ${w}×${h}, ${kb(out)} КБ за ${Date.now() - started} мс`);
      resolve(out);
    };
    img.onerror = () => reject(new Error("не удалось прочитать изображение"));
    img.src = dataUrl;
  });
}

export function cleanPlan(dataUrl, color) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const started = Date.now();
      try {
        const out = process(img, color);
        logInfo(`чертёж обработан: ${img.width}×${img.height} → ${kb(out)} КБ за ${Date.now() - started} мс`);
        resolve(out);
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("не удалось прочитать изображение"));
    img.src = dataUrl;
  });
}

function process(img, color) {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const n = w * h;

  // Гистограмма яркости: прозрачные пиксели считаем белым фоном.
  const lum = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = px[o + 3] / 255;
    const l = (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) * a + 255 * (1 - a);
    lum[i] = l;
    hist[Math.max(0, Math.min(255, Math.round(l)))]++;
  }

  // 2-й и 98-й процентили вместо min/max — иначе одна чёрная точка
  // или блик от сканера задирают шкалу.
  const lo = percentile(hist, n, 0.02);
  const hi = percentile(hist, n, 0.98);
  const span = Math.max(1, hi - lo);

  const rgb = hexToRgb(color);
  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let i = 0; i < n; i++) {
    let a = (hi - lum[i]) / span;          // тёмное -> непрозрачное
    a = a < NOISE ? 0 : Math.min(1, (a - NOISE) / (1 - NOISE));
    const o = i * 4;
    px[o] = rgb.r; px[o + 1] = rgb.g; px[o + 2] = rgb.b;
    px[o + 3] = Math.round(a * 255);

    if (a > 0.03) {
      const x = i % w, y = (i / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(data, 0, 0);

  if (maxX < 0) return encode(canvas, true);   // пустая картинка — отдаём как есть

  // Обрезка полей с небольшим воздухом по краям.
  const pad = Math.round(Math.max(w, h) * 0.01);
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad) - cx + 1;
  const ch = Math.min(h, maxY + pad) - cy + 1;

  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d").drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return encode(out, true);
}

function percentile(hist, total, p) {
  const target = total * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}

function hexToRgb(hex) {
  const s = String(hex).replace("#", "");
  const full = s.length === 3 ? s.split("").map(c => c + c).join("") : s;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
