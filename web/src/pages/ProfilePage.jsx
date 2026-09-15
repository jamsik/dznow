import { useEffect, useRef, useState } from "react";
import Icon from "../components/icons";
import { agencyMarkOf, initials } from "../data/brand";
import { isMock } from "../lib/api";
import { fullscreenSupported, isFullscreen, platform, setFullscreen, tg } from "../lib/telegram";
import { errorCount, getLog, logAsText, subscribe } from "../lib/log";

const ME = [
  { k: "firstName", label: "Имя",       placeholder: "Как вас зовут" },
  { k: "lastName",  label: "Фамилия",   placeholder: "Не обязательно" },
  { k: "tel",       label: "Телефон",   placeholder: "+7 999 000-00-00", inputMode: "tel" },
  { k: "telegram",  label: "Telegram",  placeholder: "@username" },
  { k: "email",     label: "Почта",     placeholder: "mail@example.ru", inputMode: "email" },
  { k: "site",      label: "Сайт",      placeholder: "example.ru" }
];

const COMPANY = [
  { k: "agencyName", label: "Название",            placeholder: "Название агентства" },
  { k: "agencyMark", label: "Знак", maxLength: 2,  placeholder: "из названия" }
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
        <div className="hint">
          Знак из букв используется, пока нет логотипа. Своё поле можно не
          заполнять — тогда знак считается из названия
          {agencyMarkOf(profile) ? <> («{agencyMarkOf(profile)}»)</> : null}.
        </div>
      </section>

      <div className="stats">
        <div className="stat"><div className="v">{projects.length}</div><div className="k">макетов</div></div>
        <div className="stat"><div className="v">2</div><div className="k">шаблона</div></div>
        <div className="stat"><div className="v">∞</div><div className="k">пробный</div></div>
      </div>

      <DevSection />
    </>
  );
}

/**
 * Отладка. Внутри Telegram консоли нет: на телефоне её не открыть вовсе,
 * на десктопе — через отладчик, до которого в жизни никто не дойдёт.
 * Поэтому всё, что приложение пишет в журнал (lib/log.js), видно здесь,
 * и есть кнопка «Скопировать» — журнал уезжает текстом в переписку.
 */
// Дата сборки зашивается в бандл в Dockerfile. Видно её здесь — и сразу
// понятно, доехало обновление до сервера или нет.
const BUILD = import.meta.env.VITE_BUILD || "";

function DevSection() {
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const [full, setFull] = useState(isFullscreen);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribe(() => bump(n => n + 1)), []);

  const entries = getLog();
  const errors = errorCount();

  const copy = async () => {
    const text = logAsText({
      режим: isMock ? "мок" : "сервер",
      платформа: platform(),
      telegram: tg()?.initData ? "да" : "нет"
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена закрыт (бывает в вебвью) — показываем текст,
      // чтобы его можно было выделить руками.
      setOpen(true);
    }
  };

  const toggleFull = () => {
    const next = !full;
    if (setFullscreen(next)) setFull(next);
  };

  return (
    <>
      <div className="notice">
        <div>
          <b>{tg()?.initData ? "Запущено в Telegram" : "Запущено в браузере"}.</b>{" "}
          {isMock
            ? "Бэкенд не подключён: профиль и макеты хранятся в этом браузере."
            : "Бэкенд подключён: макеты и рендер живут на сервере."}
          {BUILD && <><br /><span className="build">Сборка {BUILD}</span></>}
        </div>
      </div>

      {fullscreenSupported() && (
        <div className="fieldset" style={{ marginTop: 12 }}>
          <button className="row toggle" role="switch" aria-checked={full} onClick={toggleFull}>
            <span className="t">Во весь экран</span>
            <span className="sw" aria-hidden="true"><i /></span>
          </button>
        </div>
      )}
      {fullscreenSupported() && (
        <div className="hint">
          Сам режим приложение не включает: на компьютере Telegram открывает
          такое окно где ему удобно, и на двух мониторах оно встаёт поперёк
          обоих. Выключите — вернётся обычное окно, которое можно двигать.
        </div>
      )}

      <section className="section">
        <h3>Журнал</h3>
        <div className="fieldset">
          <button className="row toggle" role="switch" aria-checked={open}
                  onClick={() => setOpen(o => !o)}>
            <span className="t">
              Показать журнал
              {errors > 0 && <span className="badge-err">{errors}</span>}
            </span>
            <span className="sw" aria-hidden="true"><i /></span>
          </button>
          <button className="row room-add" onClick={copy}>
            {copied ? "Скопировано" : "Скопировать журнал"}
          </button>
        </div>

        {open && (
          <div className="journal">
            {entries.length === 0 && <div className="j-empty">Пока пусто — ничего не сломалось.</div>}
            {entries.map(e => (
              <div key={e.id} className={"j-row j-" + e.level}>
                <span className="j-t">{new Date(e.at).toLocaleTimeString("ru-RU")}</span>
                <span className="j-m">
                  {e.message}
                  {e.detail && <i>{e.detail}</i>}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="hint">
          Сюда попадают все запросы к серверу и все ошибки. Если что-то повело
          себя странно — нажмите «Скопировать журнал» и пришлите текст: по нему
          видно, что именно не сработало.
        </div>
      </section>
    </>
  );
}
