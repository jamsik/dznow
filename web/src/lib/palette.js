/**
 * Цвета макета.
 *
 * Палитра описывается двумя опорными цветами — фон и акцент. Всё остальное
 * (панели, основной текст, приглушённый текст, линии, свечение, цвет чертежа)
 * выводится из них. Так пользователю не приходится подбирать восемь цветов,
 * а макет остаётся читаемым при любом выборе.
 */

export const hexToRgb = hex => {
  const s = String(hex || "#000").replace("#", "");
  const full = s.length === 3 ? s.split("").map(c => c + c).join("") : s.padEnd(6, "0");
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const rgbToHex = ({ r, g, b }) =>
  "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export const rgba = (hex, a) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Смешать два цвета: t=0 — первый, t=1 — второй. */
export const mix = (a, b, t) => {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
};

const channel = v => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export const luminance = hex => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrast = (a, b) => {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Текст, который читается на этом фоне. */
export const inkOn = bg => (luminance(bg) > 0.42 ? "#14110C" : "#FFFFFF");

export const hsl = (h, s, l) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = n => {
    const k = (n + h / 30) % 12;
    return (l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255;
  };
  return rgbToHex({ r: f(0), g: f(8), b: f(4) });
};

/**
 * Приглушённый текст — подписи «Площадь», «Отделка», телефон, цена за метр.
 *
 * Простое mix(fg, bg, 0.42) давало контраст около 4:1, и на части палитр этот
 * серый читался плохо, а поверх фотографии пропадал совсем. Поэтому смешиваем
 * осторожнее и дотягиваем до порога, подвигая цвет к основному: лучше чуть
 * менее «приглушённо», чем нечитаемо.
 */
const DIM_MIN_CONTRAST = 5.4;

export function autoDim(bg, fg = inkOn(bg)) {
  let t = 0.34;
  let c = mix(fg, bg, t);
  while (t > 0.02 && contrast(c, bg) < DIM_MIN_CONTRAST) {
    t -= 0.04;
    c = mix(fg, bg, t);
  }
  return c;
}

/**
 * Полная палитра макета из опорных цветов.
 * `dim` необязателен: без него подписи считаются автоматически, с ним —
 * человек перебил автоподбор вручную (есть сценарии, где он не справляется).
 */
export function buildPalette({ id, title, bg, brand, dim }) {
  const fg = inkOn(bg);
  return {
    id: id || "custom",
    title: title || "Своя палитра",
    bg,
    brand,
    panel: mix(bg, fg, 0.07),
    fg,
    dim: dim || autoDim(bg, fg),
    brandInk: inkOn(brand),
    lineC: rgba(fg, 0.14),
    planStroke: brand,
    planFill: rgba(brand, 0.08),
    glow: rgba(brand, 0.16)
  };
}

/** Готовые решения. Первые три — прежние варианты оформления. */
export const PALETTE_LIBRARY = [
  { id: "graphite", title: "Графит",   bg: "#12161B", brand: "#D8A25A" },
  { id: "paper",    title: "Бумага",   bg: "#F4F1EC", brand: "#1F4B3F" },
  { id: "emerald",  title: "Изумруд",  bg: "#123A31", brand: "#EFC488" },
  { id: "midnight", title: "Полночь",  bg: "#0A0714", brand: "#7C5CFF" },
  { id: "sand",     title: "Песок",    bg: "#EFE6D9", brand: "#8A5A2B" },
  { id: "ocean",    title: "Море",     bg: "#08202E", brand: "#3FD0D6" },
  { id: "cherry",   title: "Вишня",    bg: "#1A0F12", brand: "#E4585F" },
  { id: "mint",     title: "Мята",     bg: "#EDF5F1", brand: "#116B57" },
  { id: "steel",    title: "Сталь",    bg: "#1B2026", brand: "#9FB4C7" },
  { id: "amber",    title: "Янтарь",   bg: "#160F08", brand: "#FFA653" }
];

/** Прежние варианты оформления → палитры. */
const LEGACY_SKINS = { dark: "graphite", light: "paper", accent: "emerald" };

export function resolvePalette(d = {}) {
  if (d.palette && d.palette.bg && d.palette.brand) return buildPalette(d.palette);
  const id = d.paletteId || LEGACY_SKINS[d.skin] || "graphite";
  const entry = PALETTE_LIBRARY.find(p => p.id === id) || PALETTE_LIBRARY[0];
  return buildPalette(entry);
}

/**
 * Цвет подписей с поправкой на фотографию под макетом.
 *
 * Поверх снимка приглушённый серый проваливается — на светлых участках его
 * просто не видно, — поэтому он подтягивается к основному цвету. Если цвет
 * выбран руками, не трогаем: человек уже решил. Считается здесь, а не в
 * шаблоне, чтобы пипетка в редакторе показывала ровно то, что в макете.
 */
export function effectiveDim(d = {}, p = resolvePalette(d)) {
  if (d.palette && d.palette.dim) return p.dim;
  return d.bgImage ? mix(p.dim, p.fg, 0.55) : p.dim;
}

/**
 * Случайная палитра — как в генераторах вроде coolors: берём случайный тон,
 * решаем, тёмный будет фон или светлый, и подбираем акцент рядом по кругу
 * так, чтобы он гарантированно читался на фоне.
 */
export function randomPalette() {
  const h = Math.floor(Math.random() * 360);
  const dark = Math.random() > 0.35;
  const shift = 20 + Math.floor(Math.random() * 90);
  const bh = (h + (Math.random() > 0.5 ? shift : 360 - shift)) % 360;

  for (let attempt = 0; attempt < 12; attempt++) {
    const bg = dark
      ? hsl(h, 14 + Math.random() * 18, 7 + Math.random() * 7)
      : hsl(h, 16 + Math.random() * 22, 92 + Math.random() * 5);
    const brand = dark
      ? hsl(bh, 55 + Math.random() * 35, 55 + Math.random() * 15)
      : hsl(bh, 45 + Math.random() * 35, 28 + Math.random() * 12);
    if (contrast(bg, brand) >= 3.2) return { id: "custom", title: "Своя палитра", bg, brand };
  }
  return { id: "custom", title: "Своя палитра", bg: dark ? "#12161B" : "#F4F1EC", brand: dark ? "#D8A25A" : "#1F4B3F" };
}
