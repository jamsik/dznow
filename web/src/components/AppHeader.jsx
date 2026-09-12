import Wordmark from "./Wordmark";

const TABS = [["home", "Главная"], ["projects", "Мои дизайны"], ["profile", "Профиль"]];

/**
 * Шапка. Логотип по центру, аватара нет.
 *
 * Аватар дублировал нижнюю навигацию («Профиль» и так там есть) и на
 * телефоне стоял ровно под кнопкой «…» самого Telegram. Логотип по центру
 * уходит из-под обеих телеграмовских кнопок — «Закрыть» слева, «свернуть»
 * и «…» справа. Отступ сверху считает CSS по --tg-top (lib/telegram.js).
 */
export default function AppHeader({ route, go }) {
  return (
    <header className="appbar">
      <nav className="desknav">
        {TABS.map(([r, t]) => (
          <button key={r} onClick={() => go(r)} aria-current={route === r ? "page" : undefined}>{t}</button>
        ))}
      </nav>
      <button className="wordmark-btn" onClick={() => go("home")} aria-label="DZNOW, на главную">
        <Wordmark />
      </button>
    </header>
  );
}
