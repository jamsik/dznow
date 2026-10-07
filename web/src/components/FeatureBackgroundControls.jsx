import { useRef, useState } from "react";
import { fitImage } from "../lib/planImage";

export default function FeatureBackgroundControls({ draft, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try { onChange({ bgImage: await fitImage(reader.result, 1920) }); }
      catch { onChange({ bgImage: reader.result }); }
      finally { setBusy(false); }
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return <section className="section feature-background-controls">
    <h3>Изображение фона</h3>
    <p className="hint">Фотография заполнит весь сторис. Выберите кадр, в котором место под текст остаётся спокойным.</p>
    <div className="upl">
      <div className="thumb">{draft.bgImage ? <img src={draft.bgImage} alt="" /> : <span>Фото</span>}</div>
      <div><div className="t">{draft.bgImage ? "Изображение загружено" : "Добавьте изображение"}</div>
        <div className="d">{draft.bgImage ? "Можно заменить или настроить кадрирование" : "JPG, PNG или WebP"}</div></div>
      <button type="button" className="act" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Готовим…" : draft.bgImage ? "Заменить" : "+ Загрузить"}
      </button>
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />
    {draft.bgImage && <div className="fieldset" style={{ marginTop: 12 }}>
      {[["bgX", "Сдвиг по горизонтали"], ["bgY", "Сдвиг по вертикали"]].map(([key, label]) =>
        <div className="row slider" key={key}><label htmlFor={`feature-${key}`}>{label}</label>
          <input id={`feature-${key}`} type="range" min="0" max="100" step="1"
            value={draft[key] ?? 50} onChange={event => onChange({ [key]: Number(event.target.value) })} />
          <span className="unit">{draft[key] ?? 50}%</span></div>)}
      <div className="row slider"><label htmlFor="feature-shade">Затемнение текста</label>
        <input id="feature-shade" type="range" min="0" max="0.7" step="0.02"
          value={draft.featureShade ?? 0.24} onChange={event => onChange({ featureShade: Number(event.target.value) })} />
        <span className="unit">{Math.round((draft.featureShade ?? 0.24) * 100)}%</span></div>
    </div>}
  </section>;
}
