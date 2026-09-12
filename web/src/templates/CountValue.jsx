import { useEffect, useRef, useState } from "react";

/**
 * Цифра, которая «набегает» во время проигрывания анимации.
 * Вне проигрывания всегда показывает финальное значение —
 * первый кадр макета обязан быть готовым.
 */
export default function CountValue({ value, format, playing, delay = 0, className }) {
  const [shown, setShown] = useState(value);
  const raf = useRef(0);
  const timer = useRef(0);

  useEffect(() => {
    if (!playing) { setShown(value); return; }
    const dur = 900;
    let t0 = 0;
    const step = now => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / dur);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setShown(value);
    };
    setShown(0);
    timer.current = setTimeout(() => { raf.current = requestAnimationFrame(step); }, delay * 1000);
    return () => { clearTimeout(timer.current); cancelAnimationFrame(raf.current); };
  }, [playing, value, delay]);

  return <span className={className}>{format(shown)}</span>;
}
