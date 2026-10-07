// Coordinates are in the exported 1080×1920 story, not in preview pixels.
export const STORY_SAFE = { left: 60, right: 1020, top: 250, bottom: 1670 };

export const CONTEXT_REGIONS = [
  { id: "header", title: "Логотип и ипотека", x: 90, y: 250, width: 900, height: 102 },
  { id: "title", title: "Название объекта", x: 90, y: 365, width: 900, height: 130 },
  { id: "price", title: "Цена и цена за метр", x: 90, y: 510, width: 900, height: 82 },
  { id: "finance", title: "Платёж и условия", x: 90, y: 605, width: 900, height: 86 },
  { id: "planHeading", title: "Заголовок планировки", x: 90, y: 710, width: 900, height: 70 },
  { id: "plan", title: "Планировка", x: 90, y: 805, width: 545, height: 475 },
  { id: "facts", title: "Параметры квартиры", x: 685, y: 805, width: 305, height: 475 },
  { id: "contextHeading", title: "Заголовок контекста", x: 90, y: 1315, width: 545, height: 70 },
  { id: "insight", title: "Текст вывода", x: 90, y: 1400, width: 545, height: 190 },
  { id: "amenities", title: "Время в пути", x: 685, y: 1310, width: 305, height: 340 },
  { id: "contact", title: "Имя и телефон", x: 90, y: 1583, width: 530, height: 87 }
];

const byId = Object.fromEntries(CONTEXT_REGIONS.map(region => [region.id, region]));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function clampRegionOffset(key, x = 0, y = 0) {
  const region = byId[key];
  if (!region) return { x: 0, y: 0 };
  const number = value => Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  return {
    x: clamp(number(x), STORY_SAFE.left - region.x, STORY_SAFE.right - region.x - region.width),
    y: clamp(number(y), STORY_SAFE.top - region.y, STORY_SAFE.bottom - region.y - region.height)
  };
}

export function regionStyle(offsets, key, extra = {}) {
  const region = byId[key];
  const offset = clampRegionOffset(key, offsets?.[key]?.x, offsets?.[key]?.y);
  return { ...extra, left: region.x + offset.x, top: region.y + offset.y };
}
