import { useRef } from "react";
import Icon from "../components/icons";
import { initials } from "../data/brand";
import { isMock } from "../lib/api";
import { tg } from "../lib/telegram";

const ME = [
  { k: "firstName", label: "Имя",       placeholder: "Анна" },
  { k: "lastName",  label: "Фамилия",   placeholder: "Ковалёва" },
  { k: "tel",       label: "Телефон",   placeholder: "+7 999 000-00-00", inputMode: "tel" },
  { k: "telegram",  label: "Telegram",  placeholder: "@username" },
  { k: "email",     label: "Почта",     placeholder: "mail@example.ru", inputMode: "email" },
  { k: "site",      label: "Сайт",      placeholder: "example.ru" }
];

const COMPANY = [
  { k: "agencyName", label: "Название",            placeholder: "Дом и Ключ" },
  { k: "agencyMark", label: "Знак", maxLength: 2,  placeholder: "ДК" }
];

const COLORS = ["#1F4B3F", "#0A0714", "#5533FF", "#2563FF", "#B3261E", "#8A5A2B", "#116B6B"];

/**
 * Профиль редактируется прямо здесь: то, что тут указано, подставляется
 * в макеты. Сохраняется на устройстве при каждом изменении.
 */
export default function ProfilePage({ profile, setProfile, projects }) {
  const logoInput = useRef(null);
  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const pickLogo = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("agencyLogo", reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <div className="prof">
        <div className="av">{initials(profile)}</div>
        <div>
          <div className="n">{[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Без имени"}</div>
          <div className="r">Риэлтор · {profile.agencyName || "без компании"}</div>
        </div>
      </div>

      <section className="section">
        <h3>Обо мне</h3>
        <div className="fieldset">
          {ME.map(f => (
            <div className="row" key={f.k}>
              <label htmlFor={"p-" + f.k}>{f.label}</label>
              <input id={"p-" + f.k} value={profile[f.k] || ""} placeholder={f.placeholder}
                     inputMode={f.inputMode}
                     onChange={e => set(f.k, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="hint">Эти поля подставляются в подпись макета. Что именно показывать — решается в редакторе.</div>
      </section>

      <section className="section">
        <h3>Компания</h3>

        <div className="upl">
          <div className="thumb">
            {profile.agencyLogo
              ? <img src={profile.agencyLogo} alt="" />
              : <Icon name="image" />}
          </div>
          <div>
            <div className="t">{profile.agencyLogo ? "Логотип загружен" : "Логотип компании"}</div>
            <div className="d">{profile.agencyLogo ? "Показывается вместо буквенного знака" : "PNG с прозрачным фоном смотрится лучше всего"}</div>
          </div>
          <button className="act" onClick={() => logoInput.current?.click()}>
            {profile.agencyLogo ? "Заменить" : "+ Загрузить"}
          </button>
        </div>
        {profile.agencyLogo && (
          <div className="hint">
            <button className="act" style={{ color: "var(--muted)", fontWeight: 600 }}
                    onClick={() => set("agencyLogo", null)}>Убрать логотип</button>
          </div>
        )}
        <input ref={logoInput} type="file" accept="image/*" onChange={pickLogo} />

        <div className="fieldset" style={{ marginTop: 12 }}>
          {COMPANY.map(f => (
            <div className="row" key={f.k}>
              <label htmlFor={"p-" + f.k}>{f.label}</label>
              <input id={"p-" + f.k} value={profile[f.k] || ""} placeholder={f.placeholder}
                     maxLength={f.maxLength}
                     onChange={e => set(f.k, e.target.value)} />
            </div>
          ))}
          <div className="row">
            <label>Фирменный цвет</label>
            <div className="swatches">
              {COLORS.map(c => (
                <button key={c} className="sw-dot" style={{ background: c }}
                        aria-pressed={profile.agencyColor === c}
                        aria-label={"Цвет " + c}
                        onClick={() => set("agencyColor", c)} />
              ))}
            </div>
          </div>
        </div>
        <div className="hint">Знак из букв используется, пока нет логотипа.</div>
      </section>

      <div className="stats">
        <div className="stat"><div className="v">{projects.length}</div><div className="k">макетов</div></div>
        <div className="stat"><div className="v">2</div><div className="k">шаблона</div></div>
        <div className="stat"><div className="v">∞</div><div className="k">пробный</div></div>
      </div>

      <div className="notice">
        <div>
          <b>{tg()?.initData ? "Запущено в Telegram" : "Запущено в браузере"}.</b>{" "}
          {isMock
            ? "Бэкенд не подключён: профиль и макеты хранятся в этом браузере."
            : "Бэкенд подключён: макеты и рендер живут на сервере."}
        </div>
      </div>
    </>
  );
}
