// Каталог: категории, сценарии («что нужно сделать») и шаблоны.
// В проде приходит из GET /api/catalog и фильтруется по доступам агентства.
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
  { id: "light",  title: "Светлая карточка", kind: "Story", motion: false, layout: "card",   skin: "light"  }
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
  down: 20,
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
