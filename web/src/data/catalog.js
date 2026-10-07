// Каталог: категории, сценарии («что нужно сделать») и шаблоны.
// GET /api/catalog возвращает доступные текущему пользователю макеты.
export const CATEGORIES = [
  { id: "realty",   title: "Недвижимость", ready: true  },
  { id: "auto",     title: "Авто",         ready: false },
  { id: "services", title: "Услуги",       ready: false },
  { id: "goods",    title: "Товары",       ready: false }
];

export const SCENARIOS = [
  { id: "object",   layout: "card",   title: "Объект",              desc: "Показать квартиру и основные характеристики", ready: true  },
  { id: "figure",   layout: "figure", title: "Крупная цифра",       desc: "Цена, скидка, платёж или первый взнос",        ready: true  },
  { id: "mortgage", layout: "figure", title: "Рассрочка / ипотека", desc: "Красиво показать условия покупки",             ready: false },
  { id: "digest",   layout: "card",   title: "Подборка",            desc: "Несколько объектов в одном материале",         ready: false }
];

export const TEMPLATES = [
  { id: "object", title: "Карточка объекта", kind: "Story", motion: true,  layout: "card",   skin: "dark"   },
  { id: "figure", title: "Крупная цифра",    kind: "Reel",  motion: true,  layout: "figure", skin: "accent" },
  { id: "light",  title: "Светлая карточка", kind: "Story", motion: false, layout: "card",   skin: "light"  },
  { id: "samolet", title: "Самолет · персональный", kind: "Story", motion: true, layout: "samolet", private: true },
  { id: "samolet_context", title: "Самолет · планировка и контекст", kind: "Story", motion: true, layout: "samolet_context", private: true },
  { id: "feature", title: "Поучительная фича", kind: "Story", motion: true, layout: "feature", private: true }
];

// Значения по умолчанию для схемы realty.flat.v1
export const BASE_DRAFT = {
  complex: "ЖК «Панорама»",
  rooms: "2-комнатная",
  area: 62.4,
  floor: "9 из 17",
  district: "Академгородок",
  finish: "White box",
  ready: "IV кв. 2027",
  price: 9450000,

  // Первый взнос. Ведущим может быть либо процент, либо сумма — смотря
  // как думает риэлтор: у банка условие «20,1%», у клиента на руках
  // «полтора миллиона». Второе всегда считается из первого.
  down: 20,           // процент, ведущий при downMode = "percent"
  downSum: 1890000,   // рубли, ведущие при downMode = "sum"
  downMode: "percent",
  downShow: "percent", // что видно в макете: percent · sum · both
  rate: 5.9,
  term: 25,
  tag: "Семейная ипотека 5,9%",

  // Оформление
  paletteId: "graphite",  // из библиотеки палитр
  palette: null,          // своя палитра { bg, brand, dim? } — если задана, она главнее
  fontId: "unbounded",
  textScale: 1,           // крупность мелких надписей: 1 · 1.12 · 1.22

  // Фон: картинка ЖК под содержимым, проявляется градиентом
  bgImage: null,
  bgIntensity: 0.5,       // 0 — картинка почти открыта, 1 — закрыта цветом фона
  bgDirection: "br",      // куда уходит плотная часть: tl · tr · bl · br

  // Планировка: только то, что загрузил пользователь.
  // Нет файла — блок планировки в макете просто не показывается.
  planSource: null,   // оригинал как есть
  planMode: "sketch", // sketch — чистим и перекрашиваем, raw — показываем как есть
  planImage: null,    // то, что попадает в макет
  planScale: 1,       // масштаб чертежа в своём окне
  planX: 0,           // сдвиг по горизонтали, % от окна
  planY: 0,           // сдвиг по вертикали, % от окна
  planPanel: 0.9,     // плотность подложки под чертежом поверх фото-фона

  // Что показывать на макете. Набор доступных пунктов зависит от макета.
  show: { logo: true, agency: true, tag: true, author: true, phone: true, contacts: false }
};

/**
 * Какие блоки предусмотрены в каждом макете.
 * «Крупная цифра» живёт на воздухе, поэтому строки доп. контактов там нет —
 * в редакторе этот переключатель просто не появится.
 */
export const LAYOUT_BLOCKS = {
  feature: [],
  samolet: ["logo", "agency", "tag", "author", "phone", "contacts"],
  samolet_context: ["logo", "agency", "tag", "author", "phone", "contacts"],
  card:   ["logo", "agency", "tag", "author", "phone", "contacts"],
  figure: ["logo", "agency", "tag", "author", "phone"]
};

export const BLOCK_TITLES = {
  logo:     "Логотип",
  agency:   "Название компании",
  tag:      "Плашка-акцент",
  author:   "Имя риэлтора",
  phone:    "Телефон",
  contacts: "Доп. контакты"
};

export const SAMOLET_DRAFT = {
  ...BASE_DRAFT,
  complex: "ЖК «Улаан-Хото»",
  district: "на Ключевской",
  fontId: "onest",
  palette: { bg: "#0783FA", brand: "#FFFFFF", dim: "#FFFFFF" },
  walkShop: "10 мин. пешком до Абсолюта",
  walkSchool: "20 мин. пешком до школы",
  walkKindergarten: "15 мин. пешком до детского сада"
};

export const SAMOLET_CONTEXT_DRAFT = {
  ...SAMOLET_DRAFT,
  rooms: "3-комнатная",
  area: 76.5,
  planMode: "sketch",
  walkStopAmount: "10 мин.",
  walkStopDetail: "пешком до остановки",
  walkSchoolAmount: "20 мин.",
  walkSchoolDetail: "пешком до школы",
  walkKindergartenAmount: "15 мин.",
  walkKindergartenDetail: "пешком до детского сада",
  insightTitle: "РЕНТГЕН-ВЫВОД",
  insightText: "Подойдёт семье, если важно, чтобы была школа рядом, спокойный двор и планировка без лишних метров.",
  layoutOffsets: {}
};

export const FEATURE_DRAFT = {
  ...BASE_DRAFT,
  headline: "Потоп\nна 350 000",
  rubric: "поучительная\nфича",
  bgImage: null,
  bgX: 50,
  bgY: 50,
  featureShade: 0.24,
  fontId: "onest",
  show: { logo: false, agency: false, tag: false, author: false, phone: false, contacts: false }
};

export const splitWalk = value => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d+(?:[.,]\d+)?\s*[^\s]+)\s*(.*)$/u);
  return match ? { amount: match[1], detail: match[2] } : { amount: "", detail: text };
};

export function normalizeSamoletContext(data) {
  const draft = { ...data, layoutOffsets: { ...(data.layoutOffsets || {}) } };
  for (const [prefix, legacy] of [["walkStop", "walkStop"], ["walkSchool", "walkSchool"], ["walkKindergarten", "walkKindergarten"]]) {
    if (draft[`${prefix}Amount`] !== undefined || draft[`${prefix}Detail`] !== undefined) continue;
    const { amount, detail } = splitWalk(draft[legacy]);
    draft[`${prefix}Amount`] = amount;
    draft[`${prefix}Detail`] = detail;
  }
  return draft;
}

export const draftForLayout = layout => layout === "samolet_context"
  ? normalizeSamoletContext(SAMOLET_CONTEXT_DRAFT)
  : { ...(layout === "feature" ? FEATURE_DRAFT : layout === "samolet" ? SAMOLET_DRAFT : BASE_DRAFT) };
export const scenarioForLayout = layout => layout === "samolet_context"
  ? { id: "samolet_context", layout, title: "Самолет · планировка и контекст", ready: true }
  : layout === "feature"
  ? { id: "feature", layout, title: "Поучительная фича", ready: true }
  : layout === "samolet"
  ? { id: "samolet", layout: "samolet", title: "Самолет · персональный", ready: true }
  : SCENARIOS.find(s => s.layout === layout) || SCENARIOS[0];
