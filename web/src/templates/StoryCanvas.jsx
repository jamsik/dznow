import { forwardRef } from "react";
import RealtyCard from "./RealtyCard";
import RealtyFigure from "./RealtyFigure";
import { useBrand } from "../lib/brandContext";
import { resolvePalette, rgba, effectiveDim } from "../lib/palette";
import { fontSet } from "../data/fonts";

const LAYOUTS = { card: RealtyCard, figure: RealtyFigure };
const ALL_ON = { logo: true, agency: true, tag: true, author: true, phone: true, contacts: false };

/** Куда уходит плотная часть завесы над фоновой картинкой. */
const VEIL_ANGLE = { tl: 135, tr: 225, bl: 45, br: 315 };

/**
 * Полотно 1080×1920. Цвета и шрифты приходят переменными, а не классами:
 * так одна и та же разметка обслуживает и готовые палитры, и свою,
 * собранную пользователем.
 */
const StoryCanvas = forwardRef(function StoryCanvas(
  { data, layout = "card", playing = false, forced = false, agency, author },
  ref
) {
  const brand = useBrand();
  const Layout = LAYOUTS[layout] || RealtyCard;
  const show = { ...ALL_ON, ...(data.show || {}) };
  const p = resolvePalette(data);
  const f = fontSet(data.fontId);

  const cls = [
    "story", `lay-${layout}`,
    data.planImage ? "" : "no-plan",
    data.bgImage ? "has-bg" : "",
    playing ? "playing" : "", playing && forced ? "force" : ""
  ].filter(Boolean).join(" ");

  const vars = {
    "--bg": p.bg, "--panel": p.panel, "--fg": p.fg, "--dim": effectiveDim(data, p),
    "--brand": p.brand, "--brand-ink": p.brandInk, "--line-c": p.lineC,
    "--plan-stroke": p.planStroke, "--plan-fill": p.planFill, "--glow": p.glow,
    "--display": f.display, "--story-ui": f.body,
    // Множитель для мелких надписей. Крупные размеры (цена, заголовок) не
    // трогаем: они и так читаются, а рост сломал бы вертикальную вёрстку.
    "--ts": data.textScale ?? 1,
    // Карточки фактов поверх фотографии: не сплошная заливка (иначе снимок
    // нарезан прямоугольниками), но и не полная прозрачность — цифры читаются.
    "--panel-veil": rgba(p.bg, 0.22),
    // Окно чертежа — отдельная ручка: линии плана тонкие и по фотографии
    // теряются сильнее, чем крупные цифры, поэтому подложка почти плотная.
    "--plan-panel": rgba(p.bg, Math.max(0, Math.min(1, data.planPanel ?? 0.9)))
  };

  // Завеса поверх фоновой картинки: с одного угла она прозрачнее,
  // с противоположного — плотнее. На максимуме закрывает снимок полностью:
  // без этого «самое тёмное» положение всё равно оставалось светлым.
  const i = Math.max(0, Math.min(1, data.bgIntensity ?? 0.5));
  const veil = data.bgImage
    ? `linear-gradient(${VEIL_ANGLE[data.bgDirection] ?? 315}deg,
        ${rgba(p.bg, 0.05 + 0.45 * i)} 0%, ${rgba(p.bg, 0.35 + 0.65 * i)} 100%)`
    : null;

  return (
    <div className={cls} ref={ref} style={vars}>
      {data.bgImage && (
        <div className="s-bg" aria-hidden="true">
          <img src={data.bgImage} alt="" />
          <span className="s-veil" style={{ background: veil }} />
        </div>
      )}
      <Layout
        d={data}
        show={show}
        agency={agency || brand.agency}
        author={author || brand.author}
        playing={playing}
      />
    </div>
  );
});

export default StoryCanvas;
