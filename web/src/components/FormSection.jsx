import { useEffect, useRef, useState } from "react";
import { annuity, downPayment, group, money, num, short } from "../lib/format";

/**
 * Ввод чисел. Здесь была настоящая ошибка, а не придирка.
 *
 * Поля стояли как type="number", а значение считалось через
 * `Number(raw) || 0`. Стоило начать набирать «54,» — строка переставала
 * быть числом, Number давал NaN, `|| 0` превращал его в ноль, и набранное
 * пропадало на глазах. Отсюда и «ставлю запятую — цифры слетают», и
 * «проще долго тыкать стрелочку». Плюс type="number" в части браузеров
 * сам стирает содержимое, когда считает его недопустимым, — поэтому
 * симптом плавал и не воспроизводился по заказу.
 *
 * Теперь поле текстовое с цифровой клавиатурой (inputMode), набранное
 * хранится как есть, а в данные попадает только то, что уже стало числом.
 * «54,» — ещё не число: значение просто не трогаем, пока не появится цифра.
 */

/** Разрешено ли это как промежуточный ввод. null — символ не принимаем. */
function numDraft(raw) {
  const s = String(raw).replace(/\s/g, "");
  if (s === "") return "";
  if (!/^\d*[.,]?\d*$/.test(s)) return null;   // буквы, минус, второй разделитель
  return s.replace(/^0+(?=\d)/, "");           // 0030 → 30, но «0,5» не трогаем
}

/** Число из набранного. null — набор ещё не закончен. */
function parseNum(text) {
  if (text === "" || /[.,]$/.test(text)) return null;
  const n = Number(String(text).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Строка формы. Числовые поля правятся, но не мешают вводу: цена
 *  форматируется на blur, чтобы каретка не прыгала во время набора. */
function Row({ field, value, onChange }) {
  const show = v => (field.type === "money" ? group(v) : String(v ?? ""));
  const [local, setLocal] = useState(() => show(value));

  // Что мы сами только что отправили наверх. Без этого «54,3» на секунду
  // превращалось в «54.3»: значение возвращалось из состояния числом и
  // затирало набранное вместе с запятой.
  const emitted = useRef(value);
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setLocal(show(value));
  }, [value, field.type]);   // eslint-disable-line react-hooks/exhaustive-deps

  const emit = n => { emitted.current = n; onChange(field.k, n); };

  if (field.type === "select") {
    return (
      <div className="row">
        <label htmlFor={"f-" + field.k}>{field.label}</label>
        <select id={"f-" + field.k} value={value} onChange={e => onChange(field.k, e.target.value)}>
          {field.options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  const isMoney = field.type === "money";
  const isNumber = field.type === "number";

  const handle = raw => {
    if (isMoney) {
      const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      setLocal(digits);
      emit(Number(digits) || 0);
      return;
    }
    if (isNumber) {
      const draft = numDraft(raw);
      if (draft === null) return;          // недопустимый символ — просто игнорируем
      setLocal(draft);
      const n = parseNum(draft);
      if (n !== null) emit(n);             // «54,» ещё не число — значение не трогаем
      return;
    }
    setLocal(raw);
    emit(raw);
  };

  return (
    <div className="row">
      <label htmlFor={"f-" + field.k}>{field.label}</label>
      <input
        id={"f-" + field.k}
        // Везде text: type="number" то не принимает запятую, то стирает
        // набранное сам. Цифровую клавиатуру даёт inputMode.
        type="text"
        inputMode={isMoney ? "numeric" : isNumber ? "decimal" : undefined}
        value={local}
        onChange={e => handle(e.target.value)}
        // На выходе приводим к нормальному виду: «54,» → «54», «0030» → «30»,
        // пустое поле возвращает прежнее значение, а не ноль.
        onBlur={() => setLocal(show(value))}
      />
      {field.unit && <span className="unit">{field.unit}</span>}
    </div>
  );
}

const SHOW_MODES = [
  ["percent", "Процент"],
  ["sum",     "Сумма"],
  ["both",    "Оба"]
];

/**
 * Первый взнос — три строки вместо одной.
 *
 * Риэлтор думает то процентом, то суммой: у банка условие «20,1% и ни
 * копейкой меньше», у клиента на руках «полтора миллиона». Ведущим может
 * быть любое из двух, второе считается и показывается рядом — чтобы не
 * пересчитывать в голове и не лезть в калькулятор.
 *
 * Отдельно решается, что из этого попадёт в макет: клиенту на карточке
 * обычно важнее сумма — сколько своих денег нужно, а не абстрактный процент.
 */
function DownRows({ draft, onChange }) {
  const bySum = draft.downMode === "sum";
  const { sum, percent } = downPayment(draft);

  const shown = () => (draft.downMode === "sum"
    ? group(draft.downSum)
    : String(draft.down ?? ""));
  const [local, setLocal] = useState(shown);

  // Та же защита, что и в обычной строке: пока набирают «20,», значение
  // наверх не уходит, и обратной волной запятую не затирает.
  const emitted = useRef(null);
  useEffect(() => {
    const now = draft.downMode === "sum" ? draft.downSum : draft.down;
    if (now === emitted.current) return;
    emitted.current = now;
    setLocal(shown());
  }, [draft.down, draft.downSum, draft.downMode]);   // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (key, n) => { emitted.current = n; onChange(key, n); };

  // При переключении ведущее значение пересчитывается из текущего, а не
  // сбрасывается: 20,1% превращается в свои рубли, и наоборот.
  const switchTo = mode => {
    if (mode === draft.downMode) return;
    if (mode === "sum") onChange("downSum", Math.round(sum));
    else onChange("down", Math.round(percent * 10) / 10);
    onChange("downMode", mode);
  };

  return (
    <>
      <div className="row">
        <label htmlFor="f-down">Первый взнос</label>
        <div className="seg">
          <button type="button" aria-pressed={!bySum} onClick={() => switchTo("percent")}>%</button>
          <button type="button" aria-pressed={bySum} onClick={() => switchTo("sum")}>₽</button>
        </div>
        <input
          id="f-down"
          type="text"
          inputMode="decimal"
          value={local}
          onChange={e => {
            const v = e.target.value;
            if (bySum) {
              const digits = v.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
              setLocal(digits);
              emit("downSum", Number(digits) || 0);
              return;
            }
            const drafted = numDraft(v);
            if (drafted === null) return;
            setLocal(drafted);
            const n = parseNum(drafted);
            if (n !== null) emit("down", n);
          }}
          onBlur={() => setLocal(shown())}
        />
        <span className="unit">{bySum ? "₽" : "%"}</span>
      </div>

      <div className="row result soft">
        <label>Это</label>
        <span className="v">{short(sum)} · {num(percent)}%</span>
      </div>

      <div className="row">
        <label>В макете</label>
        <div className="seg wide">
          {SHOW_MODES.map(([id, title]) => (
            <button key={id} type="button"
                    aria-pressed={(draft.downShow || "percent") === id}
                    onClick={() => onChange("downShow", id)}>{title}</button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function FormSection({ section, draft, onChange }) {
  return (
    <section className="section">
      <h3>{section.title}</h3>
      <div className="fieldset">
        {section.rows.map(f => (
          f.type === "down"
            ? <DownRows key={f.k} draft={draft} onChange={onChange} />
            : <Row key={f.k} field={f} value={draft[f.k]} onChange={onChange} />
        ))}
        {section.showPayment && (
          <div className="row result">
            <label>Платёж в месяц</label>
            <span className="v">≈ {money(annuity(draft))}</span>
          </div>
        )}
      </div>
    </section>
  );
}
