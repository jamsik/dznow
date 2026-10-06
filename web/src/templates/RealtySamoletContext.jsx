import CountValue from "./CountValue";
import { StoryPlan } from "./BrandBits";
import { annuity, downLabel, money, num } from "../lib/format";
import areaIcon from "../assets/samolet/area.png";
import floorIcon from "../assets/samolet/floor.png";
import readyIcon from "../assets/samolet/ready.png";
import finishIcon from "../assets/samolet/finish.png";

// The default lockup is one SVG: the wordmark, plus badge, pin and address
// always move and scale together. An uploaded complete logo replaces it as one image.
function SamoletLockup({ district }) {
  return <svg className="sc-lockup" viewBox="0 0 430 112" role="img" aria-label={`Самолет плюс ${district || ""}`}>
    <text x="0" y="42" fill="#fff" fontFamily="CoFo Sans, sans-serif" fontWeight="700" fontSize="47">самолет</text>
    <rect x="228" y="12" width="108" height="36" rx="2" fill="#fff" />
    <text x="235" y="40" fill="#087ffa" fontFamily="CoFo Sans, sans-serif" fontWeight="900" fontSize="34" fontStyle="italic">плюс</text>
    <path d="M348 28h18a13 13 0 0 1 13 13v12" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    <path d="M17 63a16 16 0 0 0-16 16c0 12 16 30 16 30s16-18 16-30a16 16 0 0 0-16-16Zm0 22a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z" fill="#fff" />
    <text x="49" y="100" fill="#fff" fontFamily="CoFo Sans, sans-serif" fontWeight="700" fontSize="34">{district || "на Ключевской"}</text>
  </svg>;
}

function AmenityIcon({ kind }) {
  const paths = {
    stop: <><rect x="9" y="11" width="22" height="22" rx="3" /><path d="M13 17h14M13 25h14M14 33v3m12-3v3" /></>,
    school: <><path d="M5 18 20 9l15 9-15 9-15-9Zm6 5v8c5 5 13 5 18 0v-8M35 18v12" /></>,
    kindergarten: <><path d="M8 27c2-8 7-12 13-12 7 0 11 5 11 13M13 28v6m14-6v6M16 17l-3-7m10 6 4-7M8 34h26" /></>
  };
  return <svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

export default function RealtySamoletContext({ d, show, agency, author, playing }) {
  const facts = [
    [areaIcon, "Площадь", `${num(d.area)} м²`],
    [floorIcon, "Этаж", d.floor],
    [readyIcon, "Сдача", d.ready],
    [finishIcon, "Отделка", d.finish]
  ];
  const amenities = [
    ["stop", d.walkStop],
    ["school", d.walkSchool],
    ["kindergarten", d.walkKindergarten]
  ].filter(([, value]) => value);

  return <>
    <svg className="sc-top-shape" viewBox="0 0 575 355" preserveAspectRatio="none" aria-hidden="true">
      <path fill="#fff" d="M0 0H575V320L145 355Q87 355 68 312Z" />
    </svg>
    <svg className="sc-bottom-shape" viewBox="0 0 660 370" preserveAspectRatio="none" aria-hidden="true">
      <path fill="#fff" d="M0 50 450 0Q510 -3 540 48L660 370H0Z" />
    </svg>

    <div className="sc-header">
      {show.logo && (agency.logo
        ? <img className="sc-uploaded-logo" src={agency.logo} alt={agency.name || "Логотип"} />
        : <SamoletLockup district={d.district} />)}
      {!show.logo && show.agency && <div className="sc-agency-name">{agency.name}</div>}
      {show.tag && <div className="sc-tag">{d.tag}</div>}
    </div>

    <div className="sc-title anim" style={{ "--d": ".1s" }}>
      <span>{d.rooms}</span><span>{d.complex}</span>
    </div>
    <div className="sc-price anim" style={{ "--d": ".2s" }}>
      <CountValue className="sc-total" value={d.price} format={money} playing={playing} delay={0.2} />
      {Number(d.area) > 0 && <span className="sc-meter">{num(Math.round(d.price / d.area))} ₽ за м²</span>}
    </div>
    <div className="sc-finance anim" style={{ "--d": ".3s" }}>
      <div className="sc-payment"><CountValue value={annuity(d)} format={money} playing={playing} delay={0.3} /><span>в ипотеку</span></div>
      <div className="sc-terms">взнос {downLabel(d)} · {num(d.rate)}%<br />на {num(d.term)} лет</div>
    </div>

    <div className="sc-section sc-plan-heading anim" style={{ "--d": ".4s" }}>
      ПЛАНИРОВКА — <strong>ЭТО ПЕРВАЯ СТОРОНА</strong>
    </div>
    <div className="sc-plan-card anim" style={{ "--d": ".5s" }}>
      {d.planImage
        ? <StoryPlan d={d} className="sc-plan-art" />
        : <span className="sc-plan-empty">Планировка объекта</span>}
    </div>
    <div className="sc-facts">
      {facts.map(([icon, label, value], i) => <div className="sc-fact anim" key={label} style={{ "--d": `${.55 + i * .08}s` }}>
        <img src={icon} alt="" />
        <div><span>{label}</span><strong>{value}</strong></div>
      </div>)}
    </div>

    <div className="sc-section sc-context-heading anim" style={{ "--d": ".9s" }}>
      КОНТЕКСТ — <strong>ВТОРАЯ</strong>
    </div>
    <div className="sc-insight anim" style={{ "--d": "1s" }}>
      <div className="sc-insight-title"><span aria-hidden="true">▤</span>{d.insightTitle}</div>
      <p>{d.insightText}</p>
    </div>
    <div className="sc-amenities">
      {amenities.map(([kind, value], i) => <div className="sc-amenity anim" key={kind} style={{ "--d": `${1 + i * .08}s` }}>
        <span className="sc-amenity-icon"><AmenityIcon kind={kind} /></span>
        <span>{value}</span>
      </div>)}
    </div>

    {(show.author || show.phone) && <div className="sc-contact anim" style={{ "--d": "1.25s" }}>
      <svg viewBox="0 0 36 36" aria-hidden="true" fill="currentColor"><path d="M9 4c-2 0-5 3-5 7 0 10 11 21 21 21 4 0 7-3 7-5 0-1-1-2-2-3l-5-3c-1-1-3-1-4 1l-2 2c-4-2-7-5-9-9l2-2c2-1 2-3 1-4l-3-5C10 4 9 4 9 4Z" /></svg>
      <div>{show.author && <strong>{author.name}</strong>}{show.phone && <strong>{author.tel}</strong>}</div>
    </div>}
  </>;
}
