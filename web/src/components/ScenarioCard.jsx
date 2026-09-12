import StoryPreview from "./StoryPreview";
import Icon from "./icons";

/** Карточка задачи «что нужно сделать», а не «какой шаблон красивее». */
export function ScenarioHero({ scenario, data, onClick }) {
  return (
    <button className="sc-hero" onClick={onClick}>
      <StoryPreview data={data} layout={scenario.layout} />
      <div>
        <div className="t">{scenario.title}</div>
        <div className="d">{scenario.desc}</div>
        <span className="go">Создать <Icon name="chev" /></span>
      </div>
    </button>
  );
}

export function ScenarioTile({ scenario, data, onClick }) {
  return (
    <button className={"sc" + (scenario.ready ? "" : " locked")} onClick={onClick}>
      <StoryPreview data={data} layout={scenario.layout} />
      <div>
        <div className="t">{scenario.title}</div>
        <div className="d">{scenario.desc}</div>
        {!scenario.ready && <span className="badge-soon">скоро</span>}
      </div>
    </button>
  );
}
