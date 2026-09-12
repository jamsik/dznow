import { useEffect } from "react";

export const tg = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : null);

/** Один раз на старте: развернуть вебвью, забрать тему Telegram. */
export function initTelegram() {
  const app = tg();
  if (!app) return null;
  try {
    app.ready();
    app.expand();
    if (app.colorScheme) document.documentElement.dataset.theme = app.colorScheme;
    const bg = app.themeParams?.bg_color;
    if (bg) document.documentElement.style.setProperty("--tg-bg", bg);
    app.onEvent?.("themeChanged", () => {
      document.documentElement.dataset.theme = app.colorScheme;
    });
  } catch (e) { /* вне Telegram — обычный браузер */ }
  return app;
}

/** Профиль из initData. Подпись доверять нельзя на клиенте — сервер проверяет HMAC. */
export function telegramUser() {
  const u = tg()?.initDataUnsafe?.user;
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return {
    id: u.id,
    name: name || u.username || "Пользователь",
    initials: (name || u.username || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase(),
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
