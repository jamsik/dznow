import StoryPreview from "../components/StoryPreview";
import { SCENARIOS } from "../data/catalog";
import { plural, whenLabel } from "../lib/format";

export default function ProjectsPage({ projects, onOpen, onRepeat }) {
  return (
    <>
      <h1 className="h1">Мои дизайны</h1>
      <p className="sub">
        {projects.length} {plural(projects.length, ["макет", "макета", "макетов"])} · хранятся 30 дней
      </p>
      {projects.length ? (
        <div className="plist">
          {projects.map(p => (
            <div key={p.id} className="pitem">
              <StoryPreview data={p.data} layout={p.layout} />
              <div>
                <div className="t">{p.title}</div>
                <div className="m">
                  {(SCENARIOS.find(s => s.id === p.scenario) || {}).title} · {whenLabel(p.at)}
                </div>
                <div className="acts">
                  <button onClick={() => onOpen(p)}>Открыть</button>
                  <button className="rep" onClick={() => onRepeat(p)}>Повторить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">Пока пусто. Создайте первый макет на главной.</div>}
    </>
  );
}
