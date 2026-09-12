/**
 * Профиль пользователя и его компании.
 * Это то, что подставляется в макеты: подпись, телефон, логотип, цвет.
 * Пока хранится на устройстве (lib/profile.js), в проде приедет из
 * GET /api/me вместе с тарифом и темой агентства.
 */
export const DEFAULT_PROFILE = {
  firstName: "Анна",
  lastName: "Ковалёва",
  tel: "+7 999 214-08-55",
  telegram: "@kovaleva_realty",
  email: "",
  site: "",

  agencyName: "Дом и Ключ",
  agencyMark: "ДК",          // 1–2 буквы, если логотипа нет
  agencyColor: "#1F4B3F",
  agencyLogo: null           // картинка, если загружена
};

export const fullName = p =>
  [p.firstName, p.lastName].filter(Boolean).join(" ").trim();

export const initials = p => {
  const s = (p.firstName?.[0] || "") + (p.lastName?.[0] || "");
  return s.toUpperCase() || "?";
};

/** Строка дополнительных контактов для подписи макета. */
export const contactsLine = p =>
  [p.telegram, p.email, p.site].map(v => (v || "").trim()).filter(Boolean).join("  ·  ");

/** То, что видят шаблоны. */
export const brandFrom = profile => ({
  agency: {
    name: profile.agencyName,
    mark: profile.agencyMark,
    color: profile.agencyColor,
    logo: profile.agencyLogo
  },
  author: {
    name: fullName(profile),
    tel: profile.tel,
    contacts: contactsLine(profile)
  }
});
