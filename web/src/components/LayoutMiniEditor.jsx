import { useState } from "react";
import { CONTEXT_REGIONS, clampRegionOffset } from "../data/samoletContextLayout";

export default function LayoutMiniEditor({ active, onActive, selected, onSelected, offsets, onChange, onReset }) {
  const [step, setStep] = useState(10);
  const current = offsets?.[selected] || { x: 0, y: 0 };
  const move = (x, y) => onChange(selected, clampRegionOffset(selected, Number(current.x || 0) + x, Number(current.y || 0) + y));

  return <section className="section layout-mini-editor">
    <h3>Расположение элементов</h3>
    <p className="hint">Включите режим и перетаскивайте блоки на макете. После сохранения положение изменится во всех карточках этого шаблона. Верхняя и нижняя безопасные зоны защищены.</p>
    <button type="button" className="btn line layout-edit-toggle" aria-pressed={active} onClick={() => onActive(!active)}>
      {active ? "Готово · выключить перемещение" : "Перемещать блоки"}
    </button>
    {active && <div className="layout-edit-controls">
      <label htmlFor="layout-region">Блок</label>
      <select id="layout-region" value={selected} onChange={event => onSelected(event.target.value)}>
        {CONTEXT_REGIONS.map(region => <option key={region.id} value={region.id}>{region.title}</option>)}
      </select>
      <div className="layout-step" aria-label="Шаг перемещения">
        <span>Шаг:</span>
        {[1, 10].map(value => <button key={value} type="button" aria-pressed={step === value}
          onClick={() => setStep(value)}>{value} px</button>)}
      </div>
      <div className="layout-arrows" aria-label="Точная настройка положения">
        <button type="button" onClick={() => move(-step, 0)} aria-label={`На ${step} пикселей влево`}>←</button>
        <button type="button" onClick={() => move(0, -step)} aria-label={`На ${step} пикселей вверх`}>↑</button>
        <button type="button" onClick={() => move(0, step)} aria-label={`На ${step} пикселей вниз`}>↓</button>
        <button type="button" onClick={() => move(step, 0)} aria-label={`На ${step} пикселей вправо`}>→</button>
      </div>
      <div className="layout-coordinates">Сдвиг: {Math.round(current.x || 0)} px по горизонтали, {Math.round(current.y || 0)} px по вертикали</div>
      <div className="layout-reset">
        <button type="button" className="act" onClick={() => onChange(selected, { x: 0, y: 0 })}>Вернуть этот блок</button>
        <button type="button" className="act" onClick={onReset}>Вернуть весь макет</button>
      </div>
    </div>}
  </section>;
}
