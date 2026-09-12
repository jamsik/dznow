import { useEffect } from "react";

export const tg = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : null);

/**
 * Безопасные отступы.
 *
 * В полноэкранном режиме Telegram рисует свои кнопки («Закрыть», «…»)
 * поверх страницы, а не над ней. Без этих отступов шапка приложения
 * оказывалась ровно под ними — логотип и заголовок перечёркивались
 * телеграмовскими элементами.
 *
 * safeAreaInset — вырез экрана (чёлка), contentSafeAreaInset — то, что
 * занял сам Telegram. Складываем: нужно уйти ниже обоих.
 */
function applyInsets(app) {
  const root = document.documentElement;
  const sa = app.safeAreaInset || {};
  const ca = app.contentSafeAreaInset || {};
  const px = v => (Number(v) || 0) + "px";
  // Раздельно, а не одной суммой: у них разный смысл.
  //   --tg-safe-top    — вырез экрана, под него нельзя ничего класть;
  //   --tg-content-top — полоса, где Telegram рисует свои кнопки. Кнопки
  //                      стоят по краям, середина свободна, и логотип
  //                      приложения встаёт как раз туда — иначе сверху
  //                      оставалась пустая полоса в палец высотой.
  //   --tg-top         — сумма, для экранов, которым надо уйти ниже всего.
  root.style.setProperty("--tg-safe-top", px(sa.top));
  root.style.setProperty("--tg-content-top", px(ca.top));
  root.style.setProperty("--tg-top", px((sa.top || 0) + (ca.top || 0)));
  root.style.setProperty("--tg-bottom", px((sa.bottom || 0) + (ca.bottom || 0)));
  root.style.setProperty("--tg-left", px(sa.left));
  root.style.setProperty("--tg-right", px(sa.right));
}

/** Один раз на старте: развернуть вебвью, забрать тему и отступы Telegram. */
export function initTelegram() {
  const app = tg();
  if (!app) return null;
  try {
    app.ready();
    app.expand();
    if (app.colorScheme) document.documentElement.dataset.theme = app.colorScheme;
    const bg = app.themeParams?.bg_color;
    if (bg) document.documentElement.style.setProperty("--tg-bg", bg);

    // Свайп вниз по содержимому сворачивал окно приложения: листаешь список
    // объектов — Mini App уезжает вниз. Telegram отдаёт это на откуп
    // приложению начиная с Bot API 7.7.
    app.disableVerticalSwipes?.();

    applyInsets(app);
    // Отступы меняются на ходу: поворот экрана, вход и выход из полного
    // экрана. Подписываемся на все три события — какие-то из них есть
    // не во всех версиях клиента, лишние просто не сработают.
    ["safeAreaChanged", "contentSafeAreaChanged", "fullscreenChanged",
     "viewportChanged"].forEach(ev => app.onEvent?.(ev, () => applyInsets(app)));

    app.onEvent?.("themeChanged", () => {
      document.documentElement.dataset.theme = app.colorScheme;
    });
  } catch (e) { /* вне Telegram — обычный браузер */ }
  return app;
}

/** Какой клиент: ios · android · tdesktop · macos · web · unknown */
export const platform = () => tg()?.platform || "unknown";

export const isDesktop = () => ["tdesktop", "macos", "web"].includes(platform());

/**
 * Полноэкранный режим. Сами его не включаем: на десктопе Telegram открывает
 * такое окно там, где считает нужным, и на двух мониторах оно может встать
 * поперёк обоих. Пусть решает человек — переключатель в «Профиле».
 */
export const fullscreenSupported = () => {
  const app = tg();
  return Boolean(app && typeof app.requestFullscreen === "function");
};

export const isFullscreen = () => Boolean(tg()?.isFullscreen);

export function setFullscreen(on) {
  const app = tg();
  if (!app) return false;
  try {
    if (on) app.requestFullscreen?.();
    else app.exitFullscreen?.();
    return true;
  } catch (e) {
    return false;
  }
}

/** Профиль из initData. Подпись доверять нельзя на клиенте — сервер проверяет HMAC. */
export function telegramUser() {
  const u = tg()?.initDataUnsafe?.user;
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return {
    id: u.id,
    first: u.first_name || "",
    last: u.last_name || "",
    name: name || u.username || "Пользователь",
    initials: (name || u.username || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase(),
    // Телефон Telegram в Mini App не отдаёт — его человек вводит сам.
    tel: null
  };
}

export const initDataRaw = () => tg()?.initData || "";

/** Нативная кнопка «Назад» в шапке Telegram. */
export function useTelegramBack(onBack, visible) {
  useEffect(() => {
    const app = tg();
    if (!app?.BackButton) return;
    if (visible) {
      app.BackButton.show();
      app.BackButton.onClick(onBack);
      return () => { app.BackButton.offClick(onBack); app.BackButton.hide(); };
    }
    app.BackButton.hide();
  }, [onBack, visible]);
}

export function haptic(type = "light") {
  try { tg()?.HapticFeedback?.impactOccurred(type); } catch (e) {}
}
