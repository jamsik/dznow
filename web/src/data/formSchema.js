// Схема полей шаблона. Форма строится из неё, а не хардкодится в разметке:
// новый шаблон = новая схема + новый макет.
export const FORM_SECTIONS = [
  {
    title: "Об объекте",
    rows: [
      { k: "complex",  label: "ЖК / дом",    type: "text" },
      { k: "rooms",    label: "Комнатность", type: "select",
        options: ["Студия", "1-комнатная", "2-комнатная", "3-комнатная", "4-комнатная"] },
      { k: "area",     label: "Площадь",     type: "number", unit: "м²", step: "0.1" },
      { k: "floor",    label: "Этаж",        type: "text" },
      { k: "district", label: "Район",       type: "text" },
      { k: "finish",   label: "Отделка",     type: "text" },
      { k: "ready",    label: "Срок сдачи",  type: "text" }
    ]
  },
  {
    title: "Цена",
    showPayment: true,
    rows: [
      { k: "price", label: "Цена",         type: "money",  unit: "₽" },
      // Взнос — особая строка: его задают то процентом, то суммой, и он же
      // по-разному подписывается в макете. Разметка в components/FormSection.
      { k: "down",  label: "Первый взнос", type: "down" },
      { k: "rate",  label: "Ставка",       type: "number", unit: "%",   step: "0.1" },
      { k: "term",  label: "Срок",         type: "number", unit: "лет", step: "1" }
    ]
  },
  {
    title: "Акцент",
    rows: [{ k: "tag", label: "Плашка", type: "text" }]
  }
];

export const SKIN_VARIANTS = [
  { id: "dark",   title: "Тёмный",    css: "linear-gradient(135deg,#12161B 60%,#D8A25A 60%)" },
  { id: "light",  title: "Светлый",   css: "linear-gradient(135deg,#F4F1EC 60%,#1F4B3F 60%)" },
  { id: "accent", title: "Акцентный", css: "linear-gradient(135deg,#123A31 60%,#EFC488 60%)" }
];

export const SAMOLET_SECTIONS = [...FORM_SECTIONS, {
  title: "Рядом с домом",
  rows: [
    { k: "walkShop", label: "Магазин", type: "text" },
    { k: "walkSchool", label: "Школа", type: "text" },
    { k: "walkKindergarten", label: "Детский сад", type: "text" }
  ]
}];

export const SAMOLET_CONTEXT_SECTIONS = [...FORM_SECTIONS, {
  title: "Контекст и окружение",
  rows: [
    { k: "insightTitle", label: "Заголовок вывода", type: "text" },
    { k: "insightText", label: "Вывод", type: "textarea" },
    { k: "walkStopAmount", label: "Остановка · сколько", type: "text" },
    { k: "walkStopDetail", label: "Как и куда", type: "text" },
    { k: "walkSchoolAmount", label: "Школа · сколько", type: "text" },
    { k: "walkSchoolDetail", label: "Как и куда", type: "text" },
    { k: "walkKindergartenAmount", label: "Детсад · сколько", type: "text" },
    { k: "walkKindergartenDetail", label: "Как и куда", type: "text" }
  ]
}];
