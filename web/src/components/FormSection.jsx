import { useEffect, useState } from "react";
import { annuity, downPayment, group, money, num, short } from "../lib/format";

/** Строка формы. Числовые поля правятся, но не мешают вводу: цена
 *  форматируется на blur, чтобы каретка не прыгала во время набора. */
function Row({ field, value, onChange }) {
  const [local, setLocal] = useState(field.type === "money" ? group(value) : value);
  useEffect(() => { setLocal(field.type === "money" ? group(value) : value); }, [value, field.type]);

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
  return (
    <div className="row">
      <label htmlFor={"f-" + field.k}>{field.label}</label>
      <input
        id={"f-" + field.k}
        type={isNumber ? "number" : "text"}
        inputMode={isMoney ? "numeric" : isNumber ? "decimal" : undefined}
        step={field.step}
        value={local}
        onChange={e => {
          setLocal(e.target.value);
          const raw = e.target.value;
          onChange(field.k, isMoney ? Number(raw.replace(/[^\d]/g, "")) || 0
                        : isNumber ? Number(raw) || 0 : raw);
        }}
        onBlur={() => { if (isMoney) setLocal(group(value)); }}
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

  const raw = bySum ? draft.downSum : draft.down;
  const [local, setLocal] = useState(bySum ? group(raw) : raw);
  useEffect(() => {
    setLocal(draft.downMode === "sum" ? group(draft.downSum) : draft.down);
  }, [draft.down, draft.downSum, draft.downMode]);

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
          type={bySum ? "text" : "number"}
          inputMode="decimal"
          step={bySum ? undefined : "0.1"}
          value={local}
          onChange={e => {
            const v = e.target.value;
            setLocal(v);
            if (bySum) onChange("downSum", Number(v.replace(/[^\d]/g, "")) || 0);
            else onChange("down", Number(v.replace(",", ".")) || 0);
          }}
          onBlur={() => { if (bySum) setLocal(group(draft.downSum)); }}
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
