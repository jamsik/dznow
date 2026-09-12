import { useRef } from "react";
import Icon from "./icons";

/**
 * Загрузка планировки. Два режима:
 *   «Чертёж» — картинка чистится и перекрашивается в цвет оформления,
 *   «Как есть» — показываем оригинал (для цветных 3D-планов и фото).
 */
export default function AssetUploader({ image, mode, busy, canSwitch = true, onPick, onMode, onClear }) {
  const input = useRef(null);

  const handle = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <section className="section">
      <h3>Фото или планировка</h3>

      <div className="upl">
        <div className="thumb">
          {image ? <img src={image} alt="" /> : <Icon name="image" />}
        </div>
        <div>
          <div className="t">{image ? (busy ? "Обрабатываю…" : "Планировка загружена") : "Своя планировка"}</div>
          <div className="d">
            {image ? "Показывается вместо схемы" : "PNG или JPG. Без файла рисуется схема по комнатам"}
          </div>
        </div>
        <button className="act" onClick={() => input.current?.click()}>
          {image ? "Заменить" : "+ Загрузить"}
        </button>
      </div>

      {image && (
        <>
          {canSwitch && <div className="variants two">
            <button className="variant" aria-pressed={mode === "sketch"} onClick={() => onMode("sketch")}>
              Чертёж
            </button>
            <button className="variant" aria-pressed={mode === "raw"} onClick={() => onMode("raw")}>
              Как есть
            </button>
          </div>}
          <div className="hint">
            «Чертёж» убирает белый фон и перекрашивает линии в цвет оформления —
            подходит для обычных планов застройщика. Для цветных 3D-планов берите «как есть».{" "}
            <button className="act" style={{ color: "var(--muted)", fontWeight: 600 }} onClick={onClear}>
              Убрать и вернуть схему
            </button>
          </div>
        </>
      )}

      <input ref={input} type="file" accept="image/*" onChange={handle} />
    </section>
  );
}
