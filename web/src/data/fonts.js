/**
 * Наборы шрифтов для макета. Все — с кириллицей, все есть в Google Fonts.
 * Пара «заголовок + текст»: у большинства она одинаковая, у характерных
 * акцидентных (Unbounded, Oswald, антиквы) текст остаётся нейтральным.
 */
export const FONT_SETS = [
  { id: "unbounded",  title: "Unbounded",  note: "геометрия, характер", display: '"Unbounded"',          body: '"Onest"' },
  { id: "onest",      title: "Onest",      note: "нейтральный гротеск",  display: '"Onest"',              body: '"Onest"' },
  { id: "montserrat", title: "Montserrat", note: "универсальный",        display: '"Montserrat"',         body: '"Montserrat"' },
  { id: "golos",      title: "Golos Text", note: "деловой",              display: '"Golos Text"',         body: '"Golos Text"' },
  { id: "rubik",      title: "Rubik",      note: "мягкий",               display: '"Rubik"',              body: '"Rubik"' },
  { id: "oswald",     title: "Oswald",     note: "узкий, плакатный",     display: '"Oswald"',             body: '"Onest"' },
  { id: "playfair",   title: "Playfair",   note: "антиква, премиум",     display: '"Playfair Display"',   body: '"Onest"' },
  { id: "cormorant",  title: "Cormorant",  note: "тонкая антиква",       display: '"Cormorant Garamond"', body: '"Onest"' },
  { id: "ptserif",    title: "PT Serif",   note: "классика",             display: '"PT Serif"',           body: '"Onest"' }
];

export const fontSet = id => FONT_SETS.find(f => f.id === id) || FONT_SETS[0];
