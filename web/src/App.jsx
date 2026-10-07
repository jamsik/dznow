import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "./components/AppHeader";
import BottomNavigation from "./components/BottomNavigation";
import Sheet from "./components/Sheet";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import RenderPage from "./pages/RenderPage";
import ResultPage from "./pages/ResultPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProfilePage from "./pages/ProfilePage";
import OnboardingPage from "./pages/OnboardingPage";
import { api, isMock } from "./lib/api";
import { materialize } from "./lib/upload";
import { brandFrom } from "./data/brand";
import { loadProfile, saveProfile } from "./lib/profile";
import { BrandContext } from "./lib/brandContext";
import { LayoutSettingsContext } from "./lib/layoutSettingsContext";
import { BASE_DRAFT, SCENARIOS, TEMPLATES, draftForLayout, normalizeSamoletContext, scenarioForLayout } from "./data/catalog";
import { initTelegram, telegramUser, useTelegramBack } from "./lib/telegram";
import { logError, logInfo } from "./lib/log";
import { loadSamoletFont } from "./lib/samoletFont";

const FULL_SCREEN = ["editor", "render", "result"];

export default function App() {
  const [route, setRoute] = useState("home");
  const [category, setCategory] = useState("realty");
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [templateId, setTemplateId] = useState("object");
  const [draft, setDraft] = useState({ ...BASE_DRAFT });
  const [projects, setProjects] = useState([]);
  const [allowedTemplates, setAllowedTemplates] = useState([]);
  const [layoutSettings, setLayoutSettings] = useState(null);
  const [access, setAccess] = useState(isMock ? "granted" : "loading");
  const [accessError, setAccessError] = useState("");
  const templates = TEMPLATES.filter(t => allowedTemplates.includes(t.id));
  const [profile, setProfile] = useState(loadProfile);
  const [format, setFormat] = useState("png");
  const [lastProject, setLastProject] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [renderDenied, setRenderDenied] = useState(false);
  const [sheet, setSheet] = useState(null);

  const tgUser = useMemo(telegramUser, []);

  useEffect(() => {
    initTelegram();
    api.me().then(me => {
      setAccess(me?.service_access ? "granted" : "denied");
    }).catch(err => { setAccessError(err.message); setAccess("error"); });
  }, []);

  useEffect(() => {
    if (access !== "granted") return;
    logInfo("старт", `режим: ${isMock ? "мок" : "сервер"}, telegram: ${tgUser ? "да" : "нет"}`);
    api.listProjects().then(setProjects)
      .catch(err => logError("не удалось загрузить список проектов", err?.message));
    api.catalog().then(async c => {
      const ids = c.templates || [];
      if (ids.includes("samolet") || ids.includes("samolet_context")) await loadSamoletFont();
      setLayoutSettings(c.layout_settings || {});
      setAllowedTemplates(ids);
    })
      .catch(err => logError("не удалось загрузить доступные шаблоны", err?.message));
  }, [tgUser, access]);

  // профиль живёт на устройстве и сохраняется при каждом изменении
  useEffect(() => { saveProfile(profile); }, [profile]);

  const brand = useMemo(() => brandFrom(profile), [profile]);

  const go = useCallback(r => { setRoute(r); window.scrollTo(0, 0); }, []);
  const backHome = useCallback(() => go("home"), [go]);
  useTelegramBack(backHome, FULL_SCREEN.includes(route));

  const openScenario = (s, selected = s.id) => { setScenario(s); setTemplateId(selected); go("editor"); };

  const openProject = p => {
      const selected = p.template_id || (p.layout === "samolet" ? "samolet" : p.layout === "samolet_context" ? "samolet_context" : p.layout === "figure" ? "figure" : "object");
    if (!allowedTemplates.includes(selected)) return;
    setScenario(scenarioForLayout(p.layout));
    setTemplateId(selected);
    setDraft(p.layout === "samolet_context" ? normalizeSamoletContext(p.data) : { ...p.data });
    go("editor");
  };

  /** Работа экрана сборки: сохранить проект и попросить сервер отрендерить файл. */
  const renderWork = useMemo(() => async () => {
    // Картинки уезжают на сервер один раз и дальше живут ссылками.
    // До этого момента они лежат в браузере как data:URL — редактирование
    // не трогает сеть вовсе, а в тело запроса вместо мегабайтов попадает
    // строчка вида /files/u_abc123.webp.
    // planSource — исходник до обработки, нужен только редактору.
    const data = await materialize({ ...draft, planSource: null });

    const project = {
      id: "p" + Date.now(),
      title: draft.complex,
      scenario: scenario.id,
      layout: scenario.layout,
      template_id: templateId,
      at: Date.now(),
      data
    };
    setLastProject(project);
    await api.saveProject(project);
    api.listProjects().then(setProjects).catch(() => {});
    // Ошибку не глотаем: раньше здесь стоял .catch(() => null), сервер молча
    // отваливался, экран сборки досиживал до таймаута и уходил дальше — со
    // стороны это выглядело как «приложение зависло». Теперь причина
    // доезжает до экрана результата и до журнала.
    const res = await api.render({ data: project.data, layout: project.layout, templateId, format, brand });
    // Черновик тоже переводим на ссылки: иначе при «Изменить → Создать»
    // те же картинки загрузились бы ещё раз.
    setDraft(d => ({ ...d, planImage: data.planImage, bgImage: data.bgImage }));
    return res?.url || null;
  }, [draft, scenario, templateId, format, brand]);

  const soon = () => setSheet(
    <>
      <p>Этот сценарий появится в следующем обновлении. Сейчас доступны
         «Объект» и «Крупная цифра».</p>
      <button className="btn ghost si" onClick={() => setSheet(null)}>Понятно</button>
    </>
  );

  const editorMenu = () => setSheet(
    <>
      <button className="si" onClick={() => { setSheet(null); setDraft({ ...draftForLayout(scenario.layout), skin: draft.skin }); }}>
        Сбросить данные объекта
      </button>
      <button className="si danger" onClick={() => { setSheet(null); setDraft({ ...BASE_DRAFT }); go("home"); }}>
        Выйти без сохранения
      </button>
    </>
  );

  const chrome = !FULL_SCREEN.includes(route);

  if (access === "loading") return <div className="errscreen"><p className="msg">Проверяем доступ…</p></div>;
  if (access === "denied" || access === "error") return (
    <div className="errscreen">
      <h1>{access === "denied" ? "Доступ пока не открыт" : "Не удалось проверить доступ"}</h1>
      <p className="msg">{access === "denied"
        ? `Передайте администратору ваш Telegram ID: ${tgUser?.id || "не определён"}. После открытия доступа перезапустите приложение.`
        : accessError}</p>
    </div>
  );

  // Первый вход: без имени и телефона первый же макет выйдет подписанным
  // пустотой, поэтому спрашиваем их до того, как человек что-то откроет.
  if (!profile.onboarded) {
    return (
      <OnboardingPage
        profile={profile}
        tgUser={tgUser}
        onDone={fields => setProfile(p => ({ ...p, ...fields }))}
      />
    );
  }

  return (
    <LayoutSettingsContext.Provider value={layoutSettings}>
    <BrandContext.Provider value={brand}>
      {route === "render" ? (
        <RenderPage draft={draft} layout={scenario.layout} work={renderWork}
                    onDone={(url, err, denied) => { setFileUrl(url); setRenderError(err || null); setRenderDenied(Boolean(denied)); go("result"); }} />
      ) : (
        <div className="screen">
          {chrome && <AppHeader route={route} go={go} />}

          {route === "home" && (
            <HomePage category={category} setCategory={setCategory} projects={projects.filter(p => allowedTemplates.includes(p.template_id))} templates={templates} allowedTemplates={allowedTemplates} go={go}
                      onScenario={openScenario}
                      onTemplate={t => { setDraft(d => t.private ? draftForLayout(t.layout) : ({ ...d, skin: t.skin }));
                                         openScenario(scenarioForLayout(t.layout), t.id); }}
                      onOpen={openProject} onSoon={soon} />
          )}

          {route === "editor" && (
            <EditorPage scenario={scenario} draft={draft} setDraft={setDraft} agency={brand.agency}
                        onCreate={() => { setFileUrl(null); setRenderError(null); setRenderDenied(false); go("render"); }}
                        onBack={backHome} onMenu={editorMenu}
                        onProfile={() => go("profile")} />
          )}

          {route === "result" && lastProject && (
            <ResultPage project={lastProject} format={format} setFormat={setFormat} fileUrl={fileUrl}
                        error={renderError} denied={renderDenied}
                        onEdit={() => go("editor")}
                        onAgain={() => { setDraft({ ...BASE_DRAFT }); go("home"); }}
                        onSheet={setSheet} />
          )}

          {route === "projects" && (
            <ProjectsPage projects={projects.filter(p => allowedTemplates.includes(p.template_id))} onOpen={openProject}
                          onRepeat={p => { openProject(p);
                            setTimeout(() => {
                              const el = document.getElementById("f-price");
                              el?.focus(); el?.select?.();
                              el?.scrollIntoView({ block: "center", behavior: "smooth" });
                            }, 80); }} />
          )}

          {route === "profile" && (
            <ProfilePage profile={profile} setProfile={setProfile} projects={projects} />
          )}
        </div>
      )}

      {chrome && <BottomNavigation route={route} go={go} />}
      {sheet && <Sheet onClose={() => setSheet(null)}>{sheet}</Sheet>}
    </BrandContext.Provider>
    </LayoutSettingsContext.Provider>
  );
}
