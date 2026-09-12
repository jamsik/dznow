import { useState } from "react";
import Wordmark from "../components/Wordmark";

/**
 * Первый вход: имя, телефон, при желании — компания.
 *
 * Спрашиваем ровно три вещи, потому что без них первый же макет выйдет
 * подписанным пустотой. Всё остальное — Telegram, почта, сайт, логотип,
 * фирменный цвет — живёт в профиле и заполняется, когда дойдут руки.
 *
 * Имя подставляется из Telegram: человек уже представился, спрашивать
 * второй раз невежливо. Телефон Telegram в Mini App не отдаёт, его
 * приходится вводить.
 */
export default function OnboardingPage({ profile, tgUser, onDone }) {
  const [firstName, setFirst] = useState(profile.firstName || tgUser?.first || "");
  const [lastName, setLast] = useState(profile.lastName || tgUser?.last || "");
  const [tel, setTel] = useState(profile.tel || "");
  const [agencyName, setAgency] = useState(profile.agencyName || "");
  const [touched, setTouched] = useState(false);

  const nameBad = !firstName.trim();
  // Не строгая маска: у людей бывают +7, 8, скобки, добавочные.
  // Требуем только, чтобы цифр хватало на настоящий номер.
  const digits = (tel.match(/\d/g) || []).length;
  const telBad = digits < 10;
  const bad = nameBad || telBad;

  const submit = e => {
    e.preventDefault();
    setTouched(true);
    if (bad) return;
    onDone({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      tel: tel.trim(),
      agencyName: agencyName.trim(),
      onboarded: true
    });
  };

  return (
    <form className="onb" onSubmit={submit}>
      <div className="onb-logo"><Wordmark /></div>

      <h1>Давайте познакомимся</h1>
      <p className="onb-lead">
        Имя и телефон появятся в подписи макета — чтобы клиент знал,
        кому звонить. Поменять их можно в любой момент.
      </p>

      <div className="fieldset">
        <div className="row">
          <label htmlFor="onb-first">Имя</label>
          <input id="onb-first" value={firstName} autoComplete="given-name"
                 placeholder="Как вас зовут"
                 onChange={e => setFirst(e.target.value)} />
        </div>
        <div className="row">
          <label htmlFor="onb-last">Фамилия</label>
          <input id="onb-last" value={lastName} autoComplete="family-name"
                 placeholder="Не обязательно"
                 onChange={e => setLast(e.target.value)} />
        </div>
        <div className="row">
          <label htmlFor="onb-tel">Телефон</label>
          <input id="onb-tel" value={tel} inputMode="tel" autoComplete="tel"
                 placeholder="+7 999 000-00-00"
                 onChange={e => setTel(e.target.value)} />
        </div>
      </div>
      {touched && nameBad && <div className="onb-err">Без имени макет будет некому подписать</div>}
      {touched && !nameBad && telBad && <div className="onb-err">Похоже, в номере не хватает цифр</div>}

      <div className="fieldset" style={{ marginTop: 12 }}>
        <div className="row">
          <label htmlFor="onb-ag">Компания</label>
          <input id="onb-ag" value={agencyName} autoComplete="organization"
                 placeholder="Не обязательно"
                 onChange={e => setAgency(e.target.value)} />
        </div>
      </div>
      <div className="hint">
        Название агентства встанет в шапку макета. Логотип, фирменный цвет,
        почту и сайт можно добавить потом в «Профиле».
      </div>

      <button className="btn primary onb-go" type="submit" aria-disabled={bad}>
        Начать
      </button>
    </form>
  );
}
