import { useEffect, useRef, useState } from "react";
import { FEATURE_FORMATS } from "../data/featureFormats";
import { extendFeatureBackground } from "../lib/featureBackground";
import { fitImage } from "../lib/planImage";

export default function FeatureBackgroundControls({ draft, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const source = draft.featureSource || draft.bgImage;
  const format = draft.featureFormat || "9:16";
  const fit = draft.featureFit || "extend";
  const position = draft.featurePosition ?? 100;

  useEffect(() => {
    if (!source) return;
    if (fit === "cover") {
      if (draft.bgImage !== source) onChange({ bgImage: source });
      return;
    }
    let active = true;
    setBusy(true);
    extendFeatureBackground(source, format, position)
      .then(result => { if (active) onChange({ bgImage: result }); })
      .catch(error => { if (active) { console.error("[DZNOW] Фон:", error); onChange({ bgImage: source, featureFit: "cover" }); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [source, format, fit, position]);

  const pick = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try { onChange({ featureSource: await fitImage(reader.result, 1920), bgImage: null }); }
      catch { onChange({ featureSource: reader.result, bgImage: null }); }
      finally { setBusy(false); }
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return <section className="section feature-background-controls">
    <h3>Изображение фона</h3>
    <p className="hint">Загрузите фото, выберите формат и способ заполнения. В режиме достройки фон продолжается по цветам краёв изображения, включая плавный градиент.</p>
    <div className="upl">
      <div className="thumb">{source ? <img src={source} alt="" /> : <span>Фото</span>}</div>
      <div><div className="t">{source ? "Изображение загружено" : "Добавьте изображение"}</div>
        <div className="d">{busy ? "Готовим фон…" : source ? "Можно заменить или настроить" : "JPG, PNG или WebP"}</div></div>
      <button type="button" className="act" disabled={busy} onClick={() => input.current?.click()}>
        {source ? "Заменить" : "+ Загрузить"}
      </button>
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />

    <div className="feature-options">
      <div className="feature-option-label">Формат изображения</div>
      <div className="feature-format-list">{FEATURE_FORMATS.map(item =>
        <button type="button" key={item.id} className="feature-choice" aria-pressed={format === item.id}
          onClick={() => onChange({ featureFormat: item.id, bgImage: null })}>
          <strong>{item.id}</strong><small>{item.width} × {item.height}</small>
        </button>)}</div>
      <div className="feature-option-label">Как заполнить фон</div>
      <div className="feature-mode-list">
        <button type="button" className="feature-choice" aria-pressed={fit === "extend"}
          onClick={() => onChange({ featureFit: "extend", bgImage: null })}>Достроить фон</button>
        <button type="button" className="feature-choice" aria-pressed={fit === "cover"}
          onClick={() => onChange({ featureFit: "cover", bgImage: source })}>Заполнить с обрезкой</button>
      </div>
      {source && <div className="fieldset">
        {fit === "extend" ? <div className="row slider"><label htmlFor="feature-position">Положение исходного фото</label>
          <input id="feature-position" type="range" min="0" max="100" step="1" value={position}
            onChange={event => onChange({ featurePosition: Number(event.target.value), bgImage: null })} />
          <span className="unit">{position}%</span></div> :
          [["bgX", "Сдвиг по горизонтали"], ["bgY", "Сдвиг по вертикали"]].map(([key, label]) =>
            <div className="row slider" key={key}><label htmlFor={`feature-${key}`}>{label}</label>
              <input id={`feature-${key}`} type="range" min="0" max="100" step="1"
                value={draft[key] ?? 50} onChange={event => onChange({ [key]: Number(event.target.value) })} />
              <span className="unit">{draft[key] ?? 50}%</span></div>)}
        <div className="row slider"><label htmlFor="feature-shade">Затемнение текста</label>
          <input id="feature-shade" type="range" min="0" max="0.7" step="0.02"
            value={draft.featureShade ?? 0.24} onChange={event => onChange({ featureShade: Number(event.target.value) })} />
          <span className="unit">{Math.round((draft.featureShade ?? 0.24) * 100)}%</span></div>
      </div>}
    </div>
  </section>;
}
