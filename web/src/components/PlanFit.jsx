/**
 * Планировка в макете: как чертёж сидит в своём окне и насколько плотная
 * под ним подложка.
 *
 * Чертежи приходят с разными полями и пропорциями, поэтому автоматического
 * «вписать» не хватает — нужна ручка. Сдвиги стоят в одной строке: два
 * отдельных ряда занимали половину экрана ради двух чисел.
 */
export default function PlanFit({ draft, onChange }) {
  const hasPlan = Boolean(draft.planImage);
  const hasBg = Boolean(draft.bgImage);
  if (!hasPlan && !hasBg) return null;

  const set = patch => onChange(patch);

  return (
    <section className="section">
      <h3>Планировка</h3>
      <div className="fieldset">
        {hasPlan && (
          <>
            <div className="row slider">
              <label>Масштаб</label>
              <input type="range" min="0.6" max="2" step="0.02"
                     value={draft.planScale ?? 1}
                     onChange={e => set({ planScale: Number(e.target.value) })} />
              <span className="unit">{Math.round((draft.planScale ?? 1) * 100)}%</span>
            </div>

            <div className="row sliders2">
              <label>Сдвиг</label>
              <span className="ax" aria-hidden="true">←→</span>
              <input type="range" min="-40" max="40" step="1"
                     aria-label="Сдвиг по горизонтали"
                     value={draft.planX ?? 0}
                     onChange={e => set({ planX: Number(e.target.value) })} />
              <span className="ax" aria-hidden="true">↑↓</span>
              <input type="range" min="-40" max="40" step="1"
                     aria-label="Сдвиг по вертикали"
                     value={draft.planY ?? 0}
                     onChange={e => set({ planY: Number(e.target.value) })} />
            </div>
          </>
        )}

        {hasBg && (
          <div className="row slider">
            <label>Подложка</label>
            <input type="range" min="0" max="1" step="0.05"
                   value={draft.planPanel ?? 0.9}
                   onChange={e => set({ planPanel: Number(e.target.value) })} />
            <span className="unit">{Math.round((draft.planPanel ?? 0.9) * 100)}%</span>
          </div>
        )}

        {hasPlan && (
          <button className="row room-add"
                  onClick={() => set({ planScale: 1, planX: 0, planY: 0 })}>
            Сбросить подгонку
          </button>
        )}
      </div>
      {hasBg && (
        <div className="hint">
          Подложка закрывает фото под окном чертежа: на 100 % линии плана читаются
          как на ровном фоне.
        </div>
      )}
    </section>
  );
}
