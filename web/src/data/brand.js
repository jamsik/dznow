/**
 * Профиль пользователя и его компании.
 * Это то, что подставляется в макеты: подпись, телефон, логотип, цвет.
 * Пока хранится на устройстве (lib/profile.js), в проде приедет из
 * GET /api/me вместе с тарифом и темой агентства.
 */
/**
 * Пусто по умолчанию. Раньше здесь лежали «Анна Ковалёва» и «Дом и Ключ» —
 * удобно для разработки и плохо для живого человека: чужое имя подставлялось
 * в макет, и его надо было заметить и стереть. Теперь имя и телефон
 * спрашиваются один раз на входе (pages/OnboardingPage.jsx).
 */
export const DEFAULT_PROFILE = {
  firstName: "",
  lastName: "",
  tel: "",
  telegram: "",
  email: "",
  site: "",

  agencyName: "",
  agencyMark: "",            // 1–2 буквы; пустой — считается из названия
  agencyColor: "#1F4B3F",
  agencyLogo: null,          // картинка, если загружена

  onboarded: false           // прошёл ли первый экран
};

export const fullName = p =>
  [p.firstName, p.lastName].filter(Boolean).join(" ").trim();

export const initials = p => {
  const s = (p.firstName?.[0] || "") + (p.lastName?.[0] || "");
  return s.toUpperCase() || "?";
};

/**
 * Буквенный знак компании. Если человек его не задал — берём из названия:
 * «Дом и Ключ» → «ДК». Предлоги и союзы пропускаем, иначе выходило «ДИ».
 */
const SKIP = new Set(["и", "в", "на", "по", "the", "and", "of"]);
export const agencyMarkOf = p => {
  const own = (p.agencyMark || "").trim();
  if (own) return own.toUpperCase().slice(0, 2);
  const words = (p.agencyName || "").split(/[\s«»"'\-–—]+/)
    .filter(w => w && !SKIP.has(w.toLowerCase()));
  if (!words.length) return "";
  return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
};

/** Строка дополнительных контактов для подписи макета. */
export const contactsLine = p =>
  [p.telegram, p.email, p.site].map(v => (v || "").trim()).filter(Boolean).join("  ·  ");

/** То, что видят шаблоны. */
export const brandFrom = profile => ({
  agency: {
    name: profile.agencyName,
    mark: agencyMarkOf(profile),
    color: profile.agencyColor,
    logo: profile.agencyLogo
  },
  author: {
    name: fullName(profile),
    tel: profile.tel,
    contacts: contactsLine(profile)
  }
});
