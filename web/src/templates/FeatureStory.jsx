import { featureFormat } from "../data/featureFormats";

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

function headlineSize(line, width) {
  // A short line keeps the reference's oversized type; longer copy shrinks
  // inside the same safe area without moving the image beneath it.
  const estimated = Math.max(1, [...line].length) * 0.56;
  return Math.max(48, Math.min(180, Math.floor(width / estimated)));
}

function headlineLines(value) {
  const lines = [];
  for (const paragraph of String(value || "").split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const parts = word.match(/.{1,18}/gu) || [];
      for (const part of parts) {
        const candidate = current ? `${current} ${part}` : part;
        if (candidate.length > 18 && current) { lines.push(current); current = part; }
        else current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines.slice(0, 5);
}

export default function FeatureStory({ d }) {
  const lines = headlineLines(d.headline);
  const { width, height } = featureFormat(d.featureFormat);
  const horizontal = width > height;
  const titleTop = Math.round(Math.max(90, Math.min(height * .13, 250)));
  const titleLeft = Math.round(width * .095);
  const titleWidth = Math.round(width * (horizontal ? .76 : .815));
  const firstWidth = Math.round(width * (horizontal ? .55 : .53));
  const titleMaxSize = Math.round(Math.min(width * .167, height * .17, horizontal ? 185 : 180));
  const rubricLeft = Math.round(width * (horizontal ? .67 : .645));
  const rubricWidth = Math.round(width - rubricLeft - width * .055);
  const shade = clamp(d.featureShade ?? 0.24, 0, 0.7);
  const x = clamp(d.bgX ?? 50, 0, 100);
  const y = clamp(d.bgY ?? 50, 0, 100);

  return <>
    <div className="ft-background">
      {d.bgImage && <img src={d.bgImage} alt="" style={{ objectPosition: `${x}% ${y}%` }} />}
    </div>
    <div className="ft-shade" style={{ background: `linear-gradient(180deg, rgba(9,22,65,${shade}) 0%, rgba(9,22,65,${shade * .45}) 38%, rgba(9,22,65,.08) 100%)` }} />
    {!d.bgImage && <div className="ft-placeholder">Загрузите изображение фона</div>}
    <div className="ft-title anim" style={{ "--d": ".1s", left: titleLeft, top: titleTop, width: titleWidth }}>
      {lines.map((line, index) => <span key={index} className="ft-title-line"
        style={{ fontSize: Math.min(titleMaxSize, headlineSize(line, index === 0 ? firstWidth : titleWidth)), maxWidth: index === 0 ? firstWidth : titleWidth }}>{line}</span>)}
    </div>
    <div className="ft-rubric anim" style={{ "--d": ".25s", left: rubricLeft, top: titleTop + 28, width: rubricWidth,
      fontSize: Math.round(Math.min(48, width * .045, height * .052)) }}>{d.rubric}</div>
  </>;
}
