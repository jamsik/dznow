import CountValue from "./CountValue";
import { StoryHead, StoryFoot, StoryPlan } from "./BrandBits";
import { annuity, group, money, num, short } from "../lib/format";

/** realty.flat.v1 · макет «Крупная цифра» */
export default function RealtyFigure({ d, show, agency, author, playing }) {
  const pay = annuity(d);
  return (
    <>
      <StoryPlan d={d} className="s-plan" />

      <StoryHead d={d} show={show} agency={agency} />

      <div className="s-hero">
        <div className="s-kicker anim" style={{ "--d": ".35s" }}>Платёж в месяц</div>
        <div className="s-big anim" style={{ "--d": ".45s" }}>
          <CountValue value={pay} format={group} playing={playing} delay={0.45} /> <small>₽</small>
        </div>
        <div className="s-title anim" style={{ "--d": ".6s" }}>
          {d.rooms} {num(d.area)} м²<br />{d.complex}
        </div>
      </div>

      <div className="s-list">
        <div className="row anim" style={{ "--d": ".8s" }}>
          <span className="k">Стоимость</span><span className="v">{short(d.price)}</span>
        </div>
        <div className="row anim" style={{ "--d": ".88s" }}>
          <span className="k">Первый взнос</span><span className="v">{short(d.price * d.down / 100)}</span>
        </div>
        <div className="row anim" style={{ "--d": ".96s" }}>
          <span className="k">Ставка / срок</span><span className="v">{num(d.rate)}% · {num(d.term)} лет</span>
        </div>
        <div className="row anim" style={{ "--d": "1.04s" }}>
          <span className="k">Этаж / сдача</span><span className="v">{d.floor} · {d.ready}</span>
        </div>
      </div>

      <div className="s-mortgage anim" style={{ "--d": "1.3s" }}>
        <div>
          <div className="lab">В ипотеку от</div>
          <CountValue className="amt" value={pay} format={money} playing={playing} delay={1.3} />
        </div>
        <div className="terms">
          взнос {num(d.down)}% · {num(d.rate)}%<br />на {num(d.term)} лет
        </div>
      </div>

      <StoryFoot show={show} author={author} />
    </>
  );
}
