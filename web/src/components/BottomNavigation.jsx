import Icon from "./icons";

const ITEMS = [
  { r: "home", t: "Главная", i: "home" },
  { r: "projects", t: "Мои дизайны", i: "grid" },
  { r: "profile", t: "Профиль", i: "user" }
];

export default function BottomNavigation({ route, go }) {
  return (
    <nav className="bottomnav mob-only">
      <div className="in">
        {ITEMS.map(it => (
          <button key={it.r} className="nav-i" onClick={() => go(it.r)}
                  aria-current={route === it.r ? "page" : undefined}>
            <Icon name={it.i} />
            <span>{it.t}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
