import CategorySelector from "../components/CategorySelector";
import { ScenarioHero, ScenarioTile } from "../components/ScenarioCard";
import TemplateCard from "../components/TemplateCard";
import StoryPreview from "../components/StoryPreview";
import Icon from "../components/icons";
import { SCENARIOS, BASE_DRAFT, draftForLayout } from "../data/catalog";
import { relTime, short } from "../lib/format";

const previewFor = id =>
  id === "figure" ? { ...BASE_DRAFT, skin: "accent" }
  : id === "mortgage" || id === "digest" ? { ...BASE_DRAFT, skin: "light" }
  : BASE_DRAFT;

export default function HomePage({ category, setCategory, projects, templates, allowedTemplates, onScenario, onTemplate, onOpen, go, onSoon }) {
  const [hero, ...rest] = SCENARIOS.filter(s => !s.ready || allowedTemplates.includes(s.id));
  const recent = projects.slice(0, 2);

  return (
    <>
      <h1 className="h1">Что создаём?</h1>
      <p className="sub">Готовый дизайн за несколько секунд</p>

      <CategorySelector value={category} onChange={setCategory} />

      <div className="h2">Что нужно сделать?</div>
      <div className="scenarios">
        {hero && <ScenarioHero scenario={hero} data={previewFor(hero.id)} onClick={() => hero.ready ? onScenario(hero) : onSoon()} />}
        <div className="sc-pair">
          {rest.map(s => (
            <ScenarioTile key={s.id} scenario={s} data={previewFor(s.id)}
                          onClick={() => (s.ready ? onScenario(s) : onSoon())} />
          ))}
        </div>
      </div>

      {!templates.length && <div className="empty">Администратор пока не открыл вам шаблоны</div>}

      <div className="h2">Популярные шаблоны</div>
      <div className="tscroll">
        {templates.map(t => (
          <TemplateCard key={t.id} template={t} data={{ ...draftForLayout(t.layout), skin: t.skin }}
                        onClick={() => onTemplate(t)} />
        ))}
      </div>

      <div className="h2">
        Недавние
        <button className="more" onClick={() => go("projects")}>Все</button>
      </div>
      {recent.length ? recent.map(p => (
        <button key={p.id} className="recent" onClick={() => onOpen(p)}>
          <StoryPreview data={p.data} layout={p.layout} />
          <div>
            <div className="t">{p.title}</div>
            <div className="m"><b>{short(p.data.price)}</b> · {relTime(p.at)}</div>
          </div>
          <span className="cta">Продолжить <Icon name="chev" /></span>
        </button>
      )) : <div className="empty">Здесь появятся ваши последние макеты</div>}
    </>
  );
}
