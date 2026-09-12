import { useEffect, useRef, useState } from "react";
import StoryPreview from "../components/StoryPreview";
import Icon from "../components/icons";

const STEPS = ["Подготавливаем изображения", "Добавляем данные", "Собираем анимацию", "Готовим файл"];
const SLOW_AFTER = 8000;   // когда честно сказать, что сервер думает дольше обычного
const GUARD_AFTER = 45000; // когда уйти дальше без сервера, чтобы экран не висел

/**
 * Экран сборки: шаги идут по таймеру, но финал ждёт настоящий рендер.
 * Экран не имеет права зависнуть — поэтому здесь три страховки:
 * ref вместо локального флага (StrictMode монтирует эффект дважды),
 * таймаут ожидания и видимая кнопка выхода.
 */
export default function RenderPage({ draft, layout, work, onDone }) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(null);
  const result = useRef(null);
  const started = useRef(false);

  // onDone держим в ref: он приходит новой стрелкой на каждый рендер родителя,
  // и в списке зависимостей эффекта постоянно сбрасывал бы финальный таймер.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER);
    const guard = setTimeout(() => setReady(true), GUARD_AFTER);

    Promise.resolve(work?.())
      .then(url => { result.current = url; })
      .catch(err => {
        console.error("[DZNOW] рендер не удался:", err);
        setError(err?.message || String(err));
      })
      .finally(() => {
        clearTimeout(slowTimer);
        clearTimeout(guard);
        setReady(true);
      });
  }, [work]);

  useEffect(() => {
    if (step >= STEPS.length) return;
    const t = setTimeout(() => setStep(s => s + 1), 620 + Math.random() * 240);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step < STEPS.length || !ready) return;
    const t = setTimeout(() => doneRef.current(result.current), 380);
    return () => clearTimeout(t);
  }, [step, ready]);

  const waiting = step >= STEPS.length && !ready;

  return (
    <div className="renderwrap">
      <div style={{ position: "relative" }}>
        <StoryPreview data={draft} layout={layout} />
        <span className="shimmer" />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em" }}>Собираем ваш дизайн</div>
        <div className="sub" style={{ fontSize: 13.5 }}>
          {error ? "Сервер не ответил — соберём картинку на устройстве"
                 : slow ? "Сервер думает дольше обычного, ещё немного"
                 : "Обычно занимает несколько секунд"}
        </div>
      </div>

      <div className="rbar">
        <i style={{ width: `${Math.min(step, STEPS.length) / STEPS.length * 100}%` }} />
      </div>

      <div className="rsteps">
        {STEPS.map((s, i) => (
          <div key={s} className={"rstep" + (i < step ? " done" : i === step ? " active" : "")}>
            <span className="dot"><Icon name="check" /></span>{s}
          </div>
        ))}
      </div>

      {waiting && slow && (
        <button className="btn line" onClick={() => doneRef.current(result.current)}>
          Показать результат
        </button>
      )}
    </div>
  );
}
