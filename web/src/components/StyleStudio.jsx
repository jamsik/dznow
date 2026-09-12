import { useRef } from "react";
import Icon from "./icons";
import { FONT_SETS } from "../data/fonts";
import { PALETTE_LIBRARY, buildPalette, effectiveDim, randomPalette, resolvePalette } from "../lib/palette";
import { fitImage } from "../lib/planImage";

const DIRECTIONS = [
  { id: "tl", title: "↖" }, { id: "tr", title: "↗" },
  { id: "bl", title: "↙" }, { id: "br", title: "↘" }
];

/** Крупность мелких надписей. Заголовки и цены не трогаются. */
const TEXT_SIZES = [
  { v: 1,    title: "Обычный" },
  { v: 1.12, title: "Крупнее" },
  { v: 1.22, title: "Крупный" }
];

/**
 * Оформление макета: палитра, шрифт, фоновая картинка.
 * Палитра описывается двумя цветами — фон и акцент; остальное выводится,
 * чтобы человек не подбирал восемь оттенков и не ломал читаемость.
 */
export default function StyleStudio({ draft, onChange, agency }) {
  const bgInput = useRef(null);
  const current = resolvePalette(draft);
  const isCustom = Boolean(draft.palette);

  const setPalette = entry => onChange({ paletteId: entry.id, palette: null });
  const setCustom = patch => {
    const base = draft.palette || { bg: current.bg, brand: current.brand };
    onChange({ palette: { ...base, ...patch }, paletteId: "custom" });
  };

  // Цвет подписей обычно считается сам, но автоподбор не всесилен:
  // поверх пёстрой фотографии или у нестандартного фона серый всё ещё тонет.
  const dimByHand = Boolean(draft.palette && draft.palette.dim);
  const clearDim = () => {
    if (!draft.palette) return;
    const { dim, ...rest } = draft.palette;
    onChange({ palette: rest });
  };

  const pickBg = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => fitImage(reader.result)
      .then(fit => onChange({ bgImage: fit }))
      .catch(() => onChange({ bgImage: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <section className="section">
        <h3>Палитра</h3>

        <div className="palettes">
          {PALETTE_LIBRARY.map(entry => {
            const p = buildPalette(entry);
            const active = !isCustom && (draft.paletteId || "graphite") === entry.id;
            return (
              <button key={entry.id} className="pal" aria-pressed={active}
                      onClick={() => setPalette(entry)} title={entry.title}>
                <span className="pal-face" style={{ background: p.bg }}>
                  <i style={{ background: p.brand }} />
                  <i style={{ background: p.fg, opacity: .85 }} />
                </span>
                <span className="pal-name">{entry.title}</span>
              </button>
            );
          })}
        </div>

        <div className="pal-custom">
          <label className="pal-pick">
            <span>Фон</span>
            <input type="color" value={current.bg}
                   onChange={e => setCustom({ bg: e.target.value })} />
          </label>
          <label className="pal-pick">
            <span>Акцент</span>
            <input type="color" value={current.brand}
                   onChange={e => setCustom({ brand: e.target.value })} />
          </label>
          <label className="pal-pick" data-hand={dimByHand ? "1" : undefined}>
            <span>Подписи</span>
            <input type="color" value={effectiveDim(draft, current)}
                   onChange={e => setCustom({ dim: e.target.value })} />
          </label>
          <button className="btn line pal-dice" onClick={() => onChange({ palette: randomPalette(), paletteId: "custom" })}>
            <Icon name="refresh" /> Случайная
          </button>
        </div>

        <div className="hint">
          {agency?.color && (
            <>
              <button className="act" onClick={() => setCustom({ brand: agency.color })}>
                Взять фирменный цвет компании
              </button>
              {" · "}
            </>
          )}
          {dimByHand ? (
            <>
              Цвет подписей задан вручную.{" "}
              <button className="act" onClick={clearDim}>Вернуть автоподбор</button>
            </>
          ) : (
            "Панели, линии и цвет подписей подбираются автоматически под фон."
          )}
        </div>
      </section>

      <section className="section">
        <h3>Крупность текста</h3>
        <div className="sizes">
          {TEXT_SIZES.map(s => (
            <button key={s.v} className="size-chip" aria-pressed={(draft.textScale ?? 1) === s.v}
                    onClick={() => onChange({ textScale: s.v })}>
              <span className="s-sample" style={{ fontSize: 11 + (s.v - 1) * 34 }}>Аа</span>
              <b>{s.title}</b>
            </button>
          ))}
        </div>
        <div className="hint">
          Меняет только мелкие надписи — подписи фактов, контакты, район.
          Заголовок и цена остаются на месте, иначе кадр перестаёт сходиться.
        </div>
      </section>

      <section className="section">
        <h3>Шрифт</h3>
        <div className="fonts">
          {FONT_SETS.map(f => (
            <button key={f.id} className="font-chip" aria-pressed={(draft.fontId || "unbounded") === f.id}
                    onClick={() => onChange({ fontId: f.id })}>
              <span className="f-sample" style={{ fontFamily: `${f.display}, sans-serif` }}>Аа</span>
              <span className="f-meta">
                <b>{f.title}</b>
                <i>{f.note}</i>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h3>Фон макета</h3>
        <div className="upl">
          <div className="thumb">
            {draft.bgImage ? <img src={draft.bgImage} alt="" /> : <Icon name="image" />}
          </div>
          <div>
            <div className="t">{draft.bgImage ? "Фото на фоне" : "Фото ЖК на фоне"}</div>
            <div className="d">
              {draft.bgImage ? "Проявляется градиентом поверх цвета" : "Необязательно. Цвет фона останется под картинкой"}
            </div>
          </div>
          <button className="act" onClick={() => bgInput.current?.click()}>
            {draft.bgImage ? "Заменить" : "+ Загрузить"}
          </button>
        </div>
        <input ref={bgInput} type="file" accept="image/*" onChange={pickBg} />

        {draft.bgImage && (
          <>
            <div className="fieldset" style={{ marginTop: 12 }}>
              <div className="row slider">
                <label>Плотность цвета</label>
                <input type="range" min="0" max="1" step="0.05"
                       value={draft.bgIntensity ?? 0.5}
                       onChange={e => onChange({ bgIntensity: Number(e.target.value) })} />
                <span className="unit">{Math.round((draft.bgIntensity ?? 0.5) * 100)}%</span>
              </div>
              <div className="row">
                <label>Плотная часть</label>
                <div className="dirs">
                  {DIRECTIONS.map(dir => (
                    <button key={dir.id} className="dir" aria-pressed={(draft.bgDirection || "br") === dir.id}
                            onClick={() => onChange({ bgDirection: dir.id })}
                            aria-label={"Плотная часть " + dir.title}>{dir.title}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="hint">
              <button className="act" style={{ color: "var(--muted)", fontWeight: 600 }}
                      onClick={() => onChange({ bgImage: null })}>Убрать фон</button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
