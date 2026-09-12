import { useEffect, useState } from "react";
import { annuity, group, money } from "../lib/format";

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

export default function FormSection({ section, draft, onChange }) {
  return (
    <section className="section">
      <h3>{section.title}</h3>
      <div className="fieldset">
        {section.rows.map(f => (
          <Row key={f.k} field={f} value={draft[f.k]} onChange={onChange} />
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
