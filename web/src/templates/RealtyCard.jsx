import FactIcon from "./factIcons";
import CountValue from "./CountValue";
import { StoryHead, StoryFoot, StoryPlan } from "./BrandBits";
import { annuity, money, num, short } from "../lib/format";

/** realty.flat.v1 · макет «Карточка объекта» */
export default function RealtyCard({ d, show, agency, author, playing }) {
  const pay = annuity(d);
  return (
    <>
      <StoryHead d={d} show={show} agency={agency} />

      <StoryPlan d={d} style={{ "--d": ".2s" }} />

      <div className="s-title anim" style={{ "--d": ".55s" }}>
        {d.rooms}<br />{d.complex}
      </div>
      <div className="s-sub anim" style={{ "--d": ".65s" }}>
        {d.finish} · сдача {d.ready}
      </div>

      <div className="s-price anim" style={{ "--d": ".8s" }}>
        <CountValue className="v" value={d.price} format={short} playing={playing} delay={0.8} />
        <span className="c">{num(d.price / d.area)} ₽ / м²</span>
      </div>

      <div className="s-facts">
        <div className="fact anim" style={{ "--d": ".95s" }}>
          <FactIcon name="area" delay="1.05s" />
          <div>
            <div className="k">Площадь</div>
            <CountValue className="v" value={d.area} playing={playing} delay={0.95}
                        format={v => `${num(v)} м²`} />
          </div>
        </div>
        <div className="fact anim" style={{ "--d": "1.02s" }}>
          <FactIcon name="floor" delay="1.12s" />
          <div><div className="k">Этаж</div><div className="v">{d.floor}</div></div>
        </div>
        <div className="fact anim" style={{ "--d": "1.09s" }}>
          <FactIcon name="ready" delay="1.19s" />
          <div><div className="k">Ключи</div><div className="v">{d.ready}</div></div>
        </div>
        <div className="fact anim" style={{ "--d": "1.16s" }}>
          <FactIcon name="finish" delay="1.26s" />
          <div><div className="k">Отделка</div><div className="v">{d.finish}</div></div>
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
