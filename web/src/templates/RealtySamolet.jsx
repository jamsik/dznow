import CountValue from "./CountValue";
import { StoryFoot, StoryPlan } from "./BrandBits";
import { annuity, downLabel, money, num } from "../lib/format";
import areaIcon from "../assets/samolet/area.png";
import floorIcon from "../assets/samolet/floor.png";
import readyIcon from "../assets/samolet/ready.png";
import finishIcon from "../assets/samolet/finish.png";
import shopIcon from "../assets/samolet/shop.png";
import schoolIcon from "../assets/samolet/school.png";
import kindergartenIcon from "../assets/samolet/kindergarten.png";

const WALK_ICONS = {
  shop: shopIcon,
  school: schoolIcon,
  kindergarten: kindergartenIcon
};

export default function RealtySamolet({ d, show, agency, author, playing }) {
  const facts = [
    [areaIcon, "Площадь", `${num(d.area)} м²`],
    [floorIcon, "Этаж", d.floor],
    [readyIcon, "Сдача", d.ready],
    [finishIcon, "Отделка", d.finish]
  ];
  return (
    <>
      <div className="sm-head anim" style={{ "--d": ".05s" }}>
        {show.tag && <div className="sm-tag">{d.tag}</div>}
        <div className="sm-brand">
          {show.logo && agency.logo
            ? <img className="sm-logo" src={agency.logo} alt="" />
            : show.agency && <div className="sm-agency">{agency.name}</div>}
          {d.district && <div className="sm-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" /></svg>{d.district}</div>}
        </div>
      </div>

      <StoryPlan d={d} className="sm-plan anim" style={{ "--d": ".2s" }} />

      <div className="sm-title anim" style={{ "--d": ".5s" }}>{d.rooms}<br />{d.complex}</div>
      <div className="sm-price anim" style={{ "--d": ".7s" }}>
        <CountValue className="sm-total" value={d.price} format={money} playing={playing} delay={0.7} />
        {Number(d.area) > 0 && <span className="sm-meter">{num(Math.round(d.price / d.area))} ₽ за м²</span>}
      </div>

      <div className="sm-walk anim" style={{ "--d": ".85s" }}>
        {[["shop", d.walkShop], ["school", d.walkSchool], ["kindergarten", d.walkKindergarten]].map(([icon, text]) => text && (
          <div key={icon}><img src={WALK_ICONS[icon]} alt="" /><span>{text}</span></div>
        ))}
      </div>

      <div className="sm-mortgage anim" style={{ "--d": "1s" }}>
        <div><CountValue className="sm-payment" value={annuity(d)} format={money} playing={playing} delay={1} /><div>в ипотеку</div></div>
        <div className="sm-terms">Взнос {downLabel(d)} · {num(d.rate)}%<br />на {num(d.term)} лет</div>
      </div>

      <div className="sm-facts">
        {facts.map(([icon, label, value], index) => (
          <div className="sm-fact anim" key={label} style={{ "--d": `${1.1 + index * 0.08}s` }}>
            <img className="sm-fact-icon anim-pop" src={icon} alt="" style={{ "--d": `${1.2 + index * 0.08}s` }} />
            <div><div className="sm-label">{label}</div><div className="sm-value">{value}</div></div>
          </div>
        ))}
      </div>

      <StoryFoot show={show} author={author} />
    </>
  );
}
