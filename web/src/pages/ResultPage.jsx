import { useRef, useState } from "react";
import StoryPreview from "../components/StoryPreview";
import Icon, { PlayGlyph } from "../components/icons";
import { exportNodeToPng, downloadDataUrl } from "../lib/exportPng";
import { haptic } from "../lib/telegram";
import { logError } from "../lib/log";

export default function ResultPage({ project, format, setFormat, fileUrl, error, onEdit, onAgain, onSheet }) {
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const storyRef = useRef(null);
  const timer = useRef(0);

  const meta = format === "mp4" ? "MP4 · 1080×1920 · 8 сек" : "PNG · 1080×1920";

  // Сервер не отдал файл — значит, «Скачать» соберёт картинку прямо в браузере.
  // Это запасной путь: html2canvas рисует не всё и иногда съезжает, поэтому
  // о подмене надо сказать, а не молча выдать кривой файл за нормальный.

  const play = () => {
    setPlaying(false);
    clearTimeout(timer.current);
    requestAnimationFrame(() => {
      setPlaying(true);
      timer.current = setTimeout(() => setPlaying(false), 2700);
    });
  };

  const download = async () => {
    haptic("medium");
    if (format === "mp4" && !fileUrl) {
      onSheet(
        <>
          <p>Видео собирается на сервере: анимация рендерится покадрово и склеивается
             в MP4. Пока рендер-воркер не подключён, доступна картинка.</p>
          <button className="btn ghost si" onClick={() => onSheet(null)}>Понятно</button>
        </>
      );
      return;
    }
    if (fileUrl) { window.open(fileUrl, "_blank"); return; }
    setBusy(true);
    try {
      const url = await exportNodeToPng(storyRef.current);
      downloadDataUrl(url, `dznow_${Date.now()}.png`);
      onSheet(
        <>
          <img src={url} alt="Готовый макет" />
          <p>Если скачивание не началось само — сохраните картинку отсюда.</p>
          <button className="btn ghost si" onClick={() => onSheet(null)}>Закрыть</button>
        </>
      );
    } catch (e) {
      logError("сборка картинки в браузере не удалась", e?.message);
      onSheet(<><p>Не удалось собрать картинку: {e.message}</p>
                <button className="btn ghost si" onClick={() => onSheet(null)}>Закрыть</button></>);
    } finally { setBusy(false); }
  };

  const share = async () => {
    const text = `${project.data.complex} · DZNOW`;
    if (navigator.share) { try { await navigator.share({ title: "DZNOW", text }); return; } catch (e) {} }
    onSheet(
      <>
        <p>В Telegram здесь открывается системное «Поделиться»: макет уходит в чат,
           канал или сторис одним касанием.</p>
        <button className="btn ghost si" onClick={() => onSheet(null)}>Понятно</button>
      </>
    );
  };

  return (
    <>
      <header className="edbar">
        <button className="back" onClick={onEdit}><Icon name="back" /> Изменить</button>
      </header>

      <div className="result-top">
        <div className="ok"><Icon name="check" /></div>
        <h1>Готово</h1>
        <p>{meta}</p>
      </div>

      {error && !fileUrl && (
        <div className="warnbar">
          <b>Сервер файл не собрал.</b> {error}
          <br />
          «Скачать» соберёт картинку прямо в браузере — получится тот же макет,
          но качество ниже и мелкие детали могут съехать.
        </div>
      )}

      <div className="fmtpick">
        <button className="fmt-o" aria-pressed={format === "png"} onClick={() => setFormat("png")}>Картинка</button>
        <button className="fmt-o" aria-pressed={format === "mp4"} onClick={() => setFormat("mp4")}>Видео</button>
      </div>

      <div className="stagewrap" style={{ marginTop: 14 }}>
        <StoryPreview className="pv-main" data={project.data} layout={project.layout}
                      playing={playing} forced storyRef={storyRef} />
        <button className="playbtn" onClick={play}><PlayGlyph /> Просмотреть анимацию</button>
      </div>

      <div className="result-actions">
        <button className="btn primary" onClick={download} disabled={busy}>
          <Icon name="download" /> {busy ? "Готовлю файл…" : "Скачать"}
        </button>
        <div className="pair">
          <button className="btn line" onClick={share}><Icon name="share" /> Поделиться</button>
          <button className="btn line" onClick={onEdit}>Изменить</button>
        </div>
        <button className="textlink" onClick={onAgain}>Сделать ещё один</button>
      </div>
      <div style={{ height: 22 }} />
    </>
  );
}
