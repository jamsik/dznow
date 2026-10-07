import { useEffect, useState } from "react";
import StoryPreview from "../components/StoryPreview";
import LayoutMiniEditor from "../components/LayoutMiniEditor";
import { BrandContext } from "../lib/brandContext";
import { draftForLayout } from "../data/catalog";

const sample = draftForLayout("samolet_context");
const brand = {
  agency: { name: "Самолет", logo: null },
  author: { name: "Максим Выборов", tel: "8 983 357 91 20" }
};

async function request(path, csrf, options = {}) {
  const response = await fetch(`/dzadmin/api/${path}`, {
    credentials: "same-origin", ...options,
    headers: { "Content-Type": "application/json", ...(csrf ? { "X-Admin-CSRF": csrf } : {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail || "Ошибка сервера");
  return body;
}

export default function TemplateLayoutEditor() {
  const [csrf, setCsrf] = useState(null);
  const [offsets, setOffsets] = useState({});
  const [saved, setSaved] = useState({});
  const [selected, setSelected] = useState("plan");
  const [active, setActive] = useState(true);
  const [planImage, setPlanImage] = useState(null);
  const [status, setStatus] = useState("Загрузка шаблона…");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(offsets) !== JSON.stringify(saved);

  useEffect(() => {
    (async () => {
      try {
        const session = await request("session");
        if (!session.logged_in) throw new Error("Сначала войдите в админку");
        setCsrf(session.csrf);
        const layout = await request("template-layout");
        setOffsets(layout.offsets); setSaved(layout.offsets);
        await Promise.all([400, 500, 700, 900].map(weight => document.fonts.load(`${weight} 16px "CoFo Sans"`)));
        setStatus("Перетащите блок или выберите его в списке.");
      } catch (error) { setStatus(error.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const change = (key, offset) => setOffsets(current => ({ ...current, [key]: offset }));
  const save = async () => {
    setBusy(true);
    try {
      const response = await request("template-layout", csrf, {
        method: "PUT", body: JSON.stringify({ offsets })
      });
      setOffsets(response.offsets); setSaved(response.offsets);
      setStatus("Сохранено. Новое положение применяется ко всему шаблону.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };
  const loadPlan = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPlanImage(reader.result);
    reader.readAsDataURL(file);
  };

  return <main className="template-editor-page">
    <header className="template-editor-header">
      <div><a href="/dzadmin">← Админка</a><h1>Редактор шаблона</h1>
        <p>Самолет · планировка и контекст</p></div>
      <button type="button" onClick={save} disabled={loading || !csrf || !dirty || busy}>
        {busy ? "Сохраняем…" : "Сохранить для всех"}</button>
    </header>
    <p className="template-editor-status" role="status">{status}{dirty ? " · Есть несохранённые изменения" : ""}</p>
    {!csrf && !loading ? <p><a href="/dzadmin">Войти в админку</a></p> :
      <div className="template-editor-grid">
        <div className="template-editor-preview">
          <BrandContext.Provider value={brand}>
            <StoryPreview data={{ ...sample, planImage, layoutOffsets: offsets }} layout="samolet_context"
              layoutEdit={active} selectedLayoutKey={selected} onLayoutSelect={setSelected}
              onLayoutChange={change} />
          </BrandContext.Provider>
        </div>
        <aside className="template-editor-sidebar">
          <LayoutMiniEditor active={active} onActive={setActive} selected={selected}
            onSelected={setSelected} offsets={offsets} onChange={change}
            onReset={() => setOffsets({})} />
          <label className="template-editor-upload">Планировка для проверки
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={loadPlan} />
          </label>
          <p className="hint">Пробная планировка остаётся только в браузере и в шаблон не сохраняется.</p>
        </aside>
      </div>}
  </main>;
}
