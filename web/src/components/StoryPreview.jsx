import { useEffect, useRef, useState } from "react";
import StoryCanvas from "../templates/StoryCanvas";

/**
 * Коробка 9:16, внутри которой полотно 1080×1920 масштабируется по ширине.
 * Одна и та же коробка используется и для миниатюры 52 px, и для превью в редакторе.
 */
export default function StoryPreview({ data, layout, playing, forced, className = "", storyRef }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1080);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={"pv " + className} ref={box}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left",
                    position: "absolute", top: 0, left: 0 }}>
        <StoryCanvas ref={storyRef} data={data} layout={layout} playing={playing} forced={forced} />
      </div>
    </div>
  );
}
