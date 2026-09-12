import StoryPreview from "./StoryPreview";

export default function TemplateCard({ template, data, onClick }) {
  return (
    <button className="tcard" onClick={onClick}>
      <StoryPreview data={data} layout={template.layout} />
      <div className="chips">
        <span className="tchip">{template.kind}</span>
        {template.motion && <span className="tchip">анимация</span>}
      </div>
      <div className="t">{template.title}</div>
      <div className="u">Использовать</div>
    </button>
  );
}
