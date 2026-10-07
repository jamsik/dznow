import { useEffect, useRef, useState } from "react";
import StoryCanvas from "../templates/StoryCanvas";
import { featureFormat } from "../data/featureFormats";

/**
 * Коробка 9:16, внутри которой полотно 1080×1920 масштабируется по ширине.
 * Одна и та же коробка используется и для миниатюры 52 px, и для превью в редакторе.
 */
export default function StoryPreview({ data, layout, playing, forced, className = "", storyRef,
  layoutEdit = false, selectedLayoutKey, onLayoutChange, onLayoutSelect }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.1);
  const dimensions = layout === "feature" ? featureFormat(data.featureFormat) : { width: 1080, height: 1920 };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / dimensions.width);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    return () => ro.disconnect();
  }, [dimensions.width]);

  return (
    <div className={"pv " + className} ref={box} style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}`,
      ...(layout === "feature" && className.includes("pv-main")
        ? { width: `min(100%, ${Math.round(430 * dimensions.width / dimensions.height)}px)`, height: "auto" } : {}) }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left",
                    position: "absolute", top: 0, left: 0 }}>
        <StoryCanvas ref={storyRef} data={data} layout={layout} playing={playing} forced={forced}
                     layoutEdit={layoutEdit} selectedLayoutKey={selectedLayoutKey}
                     onLayoutChange={onLayoutChange} onLayoutSelect={onLayoutSelect} />
      </div>
    </div>
  );
}
