import html2canvas from "html2canvas";

/**
 * Клиентский экспорт — запасной путь, когда сервер рендера недоступен.
 * Основной путь: POST /api/render, где тот же компонент снимается в Chromium.
 */
export async function exportNodeToPng(node) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = await html2canvas(node, {
    width: 1080, height: 1920, scale: 1, backgroundColor: null,
    windowWidth: 1080, windowHeight: 1920, useCORS: true, logging: false
  });
  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
