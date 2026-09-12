import { BLOCK_TITLES, LAYOUT_BLOCKS } from "../data/catalog";

/**
 * Что показывать на макете. Список пунктов задаёт сам макет:
 * в «Крупной цифре» нет строки доп. контактов, поэтому и переключателя нет.
 */
export default function ShowToggles({ layout, show, onChange, hint }) {
  const blocks = LAYOUT_BLOCKS[layout] || [];
  if (!blocks.length) return null;

  return (
    <section className="section">
      <h3>Что показывать</h3>
      {/* В два столбца: пунктов до шести, в одну колонку они занимали экран
          целиком и отжимали оформление вниз. */}
      <div className="fieldset grid2">
        {blocks.map(key => (
          <button key={key} className="row toggle" role="switch"
                  aria-checked={Boolean(show[key])}
                  onClick={() => onChange({ ...show, [key]: !show[key] })}>
            <span className="t">{BLOCK_TITLES[key]}</span>
            <span className="sw" aria-hidden="true"><i /></span>
          </button>
        ))}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </section>
  );
}
