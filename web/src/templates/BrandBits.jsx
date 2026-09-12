import FloorPlan from "./FloorPlan";

/** Шапка макета: логотип, компания, район, плашка — каждый пункт по флагу. */
export function StoryHead({ d, show, agency }) {
  const hasLeft = show.logo || show.agency;
  return (
    <div className="s-top anim" style={{ "--d": ".05s" }}>
      {show.logo && (
        agency.logo
          ? <img className="s-logo-img" src={agency.logo} alt="" />
          : <div className="s-logo" style={agency.color ? { background: agency.color } : undefined}>
              {agency.mark}
            </div>
      )}
      {(show.agency || d.district) && (
        <div>
          {show.agency && <div className="s-agency">{agency.name}</div>}
          {d.district && <div className={"s-city" + (show.agency ? "" : " lead")}>{d.district}</div>}
        </div>
      )}
      {show.tag && d.tag ? <div className={"s-tag" + (hasLeft ? "" : " solo")}>{d.tag}</div> : null}
    </div>
  );
}

/** Подпись макета: имя, телефон, дополнительные контакты. */
export function StoryFoot({ show, author, delay = "1.5s" }) {
  const line1 = show.author || show.phone;
  const line2 = show.contacts && author.contacts;
  if (!line1 && !line2) return null;
  return (
    <div className="s-signature anim" style={{ "--d": delay }}>
      {line1 && (
        <div className="s-foot">
          {show.author && <span className="who">{author.name}</span>}
          {show.phone && <span className="tel">{author.tel}</span>}
        </div>
      )}
      {line2 && <div className="s-contacts">{author.contacts}</div>}
    </div>
  );
}

/**
 * Блок планировки. Нет картинки — нет блока.
 * Масштаб и сдвиг задаёт пользователь: чертежи приходят с разными полями,
 * и без подгонки один вписывается в окно, а другой болтается в углу.
 */
export function StoryPlan({ d, className = "s-plan anim", style }) {
  if (!d.planImage) return null;
  const fit = {
    transform: `translate(${d.planX || 0}%, ${d.planY || 0}%) scale(${d.planScale || 1})`
  };
  return (
    <div className={className} style={style}>
      <div className="s-plan-fit" style={fit}>
        <FloorPlan image={d.planImage} />
      </div>
    </div>
  );
}
