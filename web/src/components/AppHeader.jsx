import Wordmark from "./Wordmark";

const TABS = [["home", "Главная"], ["projects", "Мои дизайны"], ["profile", "Профиль"]];

export default function AppHeader({ route, go, user }) {
  return (
    <header className="appbar">
      <button className="wordmark-btn" onClick={() => go("home")} aria-label="DZNOW, на главную">
        <Wordmark />
      </button>
      <nav className="desknav">
        {TABS.map(([r, t]) => (
          <button key={r} onClick={() => go(r)} aria-current={route === r ? "page" : undefined}>{t}</button>
        ))}
      </nav>
      <button className={"avatar" + (route === "profile" ? " on" : "")}
              onClick={() => go("profile")} aria-label="Профиль">
        {user.initials}
      </button>
    </header>
  );
}
