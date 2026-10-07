import { useEffect, useRef, useState } from "react";
import StoryPreview from "../components/StoryPreview";
import FormSection from "../components/FormSection";
import AssetUploader from "../components/AssetUploader";
import ShowToggles from "../components/ShowToggles";
import PlanFit from "../components/PlanFit";
import StyleStudio from "../components/StyleStudio";
import PrimaryAction from "../components/PrimaryAction";
import LayoutMiniEditor from "../components/LayoutMiniEditor";
import Icon, { PlayGlyph } from "../components/icons";
import { FORM_SECTIONS, SAMOLET_SECTIONS, SAMOLET_CONTEXT_SECTIONS } from "../data/formSchema";
import { resolvePalette } from "../lib/palette";
import { cleanPlan, fitImage } from "../lib/planImage";
import { haptic } from "../lib/telegram";

const TABS = [
  { id: "info",   title: "Информация" },
  { id: "design", title: "Дизайн" }
];

export default function EditorPage({ scenario, draft, setDraft, agency, onCreate, onBack, onMenu, onProfile }) {
  const [playing, setPlaying] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  // Две вкладки вместо одной длинной простыни: заполнение данных и оформление —
  // разные занятия, и на телефоне пролистывать оформление ради цены было долго.
  const [tab, setTab] = useState("info");
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [selectedLayoutKey, setSelectedLayoutKey] = useState("plan");
  const timer = useRef(0);

  const play = () => {
    haptic();
    setPlaying(false);
    clearTimeout(timer.current);
    requestAnimationFrame(() => {
      setPlaying(true);
      timer.current = setTimeout(() => setPlaying(false), 2700);
    });
  };

  const change = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const patch = fields => setDraft(d => ({ ...d, ...fields }));
  const changeLayout = (key, offset) => setDraft(d => ({
    ...d, layoutOffsets: { ...(d.layoutOffsets || {}), [key]: offset }
  }));

  // Планировка пересобирается при смене файла, режима или варианта оформления:
  // цвет линий должен совпадать с цветом макета.
  const { planSource, planMode } = draft;
  const planStroke = scenario.layout === "samolet_context" ? "#087ffa" : resolvePalette(draft).planStroke;
  useEffect(() => {
    if (!planSource) return;
    let alive = true;
    setPlanBusy(true);

    // «как есть» — только уменьшаем, «чертёж» — чистим и перекрашиваем.
    const work = planMode === "raw"
      ? fitImage(planSource)
      : cleanPlan(planSource, planStroke);

    work
      .then(url => { if (alive) setDraft(d => ({ ...d, planImage: url })); })
      .catch(err => {
        console.error("[DZNOW] обработка планировки не удалась:", err);
        if (alive) setDraft(d => ({ ...d, planImage: d.planSource, planMode: "raw" }));
      })
      .finally(() => { if (alive) setPlanBusy(false); });
    return () => { alive = false; };
  }, [planSource, planMode, planStroke, setDraft]);

  return (
    <>
      <header className="edbar">
        <button className="back" onClick={onBack}><Icon name="back" /> Назад</button>
        <div className="title">{scenario.title}</div>
        <button className="iconbtn" style={{ marginLeft: "auto" }} onClick={onMenu} aria-label="Ещё">
          <Icon name="dots" />
        </button>
      </header>

      <div className="editor-grid">
        <div className="left">
          <div className="stagewrap">
            <StoryPreview className="pv-main" data={draft} layout={scenario.layout}
                          playing={playing} forced layoutEdit={layoutEdit && tab === "design"}
                          selectedLayoutKey={selectedLayoutKey} onLayoutChange={changeLayout}
                          onLayoutSelect={setSelectedLayoutKey} />
            {!layoutEdit && <button className="playbtn" data-busy={playing ? "1" : undefined} onClick={play}>
              <PlayGlyph /> Просмотреть анимацию
            </button>}
          </div>
        </div>

        <div className="right">
          <div className="tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.id} className="tab" role="tab" aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}>{t.title}</button>
            ))}
          </div>

          {tab === "info" ? (
            <>
              {(scenario.layout === "samolet_context" ? SAMOLET_CONTEXT_SECTIONS : scenario.layout === "samolet" ? SAMOLET_SECTIONS : FORM_SECTIONS).map(s => (
                <FormSection key={s.title} section={s} draft={draft} onChange={change} />
              ))}

              <AssetUploader
                image={draft.planImage}
                mode={draft.planMode}
                canSwitch={Boolean(draft.planSource)}
                busy={planBusy}
                onPick={src => {
                  // снимок с телефона может весить мегабайты — ужимаем сразу,
                  // до того как он попадёт в состояние, в базу и в запрос рендера
                  setPlanBusy(true);
                  fitImage(src)
                    .then(fit => setDraft(d => ({ ...d, planSource: fit, planMode: "sketch" })))
                    .catch(() => setDraft(d => ({ ...d, planSource: src, planMode: "sketch" })));
                }}
                onMode={m => change("planMode", m)}
                onClear={() => setDraft(d => ({ ...d, planSource: null, planImage: null }))}
              />
            </>
          ) : (
            <>
              {scenario.layout === "samolet_context" && <LayoutMiniEditor
                active={layoutEdit} onActive={value => { setPlaying(false); setLayoutEdit(value); }}
                selected={selectedLayoutKey} onSelected={setSelectedLayoutKey}
                offsets={draft.layoutOffsets} onChange={changeLayout}
                onReset={() => change("layoutOffsets", {})} />}
              <StyleStudio draft={draft} onChange={patch} agency={agency} layout={scenario.layout} />

              <PlanFit draft={draft} onChange={patch} />

              <ShowToggles
                layout={scenario.layout}
                show={draft.show}
                onChange={show => change("show", show)}
                hint={<>Данные берутся из профиля: <button className="act" onClick={onProfile}>изменить имя, контакты и логотип</button></>}
              />
            </>
          )}

          <PrimaryAction label="Создать" note="Story<br>1080×1920" onClick={onCreate} />
        </div>
      </div>
      <div className="cta-space" />
    </>
  );
}
