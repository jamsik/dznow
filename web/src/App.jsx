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
import { BASE_DRAFT, SCENARIOS } from "./data/catalog";
import { initTelegram, telegramUser, useTelegramBack } from "./lib/telegram";
import { logError, logInfo } from "./lib/log";

const FULL_SCREEN = ["editor", "render", "result"];

export default function App() {
  const [route, setRoute] = useState("home");
  const [category, setCategory] = useState("realty");
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [draft, setDraft] = useState({ ...BASE_DRAFT });
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(loadProfile);
  const [format, setFormat] = useState("png");
  const [lastProject, setLastProject] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [sheet, setSheet] = useState(null);

  const tgUser = useMemo(telegramUser, []);

  useEffect(() => {
    initTelegram();
    logInfo("старт", `режим: ${isMock ? "мок" : "сервер"}, telegram: ${tgUser ? "да" : "нет"}`);
    api.listProjects().then(setProjects)
      .catch(err => logError("не удалось загрузить список проектов", err?.message));
  }, [tgUser]);

  // профиль живёт на устройстве и сохраняется при каждом изменении
  useEffect(() => { saveProfile(profile); }, [profile]);

  const brand = useMemo(() => brandFrom(profile), [profile]);

  const go = useCallback(r => { setRoute(r); window.scrollTo(0, 0); }, []);
  const backHome = useCallback(() => go("home"), [go]);
  useTelegramBack(backHome, FULL_SCREEN.includes(route));

  const openScenario = s => { setScenario(s); go("editor"); };

  const openProject = p => {
    setScenario(SCENARIOS.find(s => s.id === p.scenario) || SCENARIOS[0]);
    setDraft({ ...p.data });
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
      at: Date.now(),
      data
    };
    setLastProject(project);
    await api.saveProject(project).catch(() => {});
    api.listProjects().then(setProjects).catch(() => {});
    // Ошибку не глотаем: раньше здесь стоял .catch(() => null), сервер молча
    // отваливался, экран сборки досиживал до таймаута и уходил дальше — со
    // стороны это выглядело как «приложение зависло». Теперь причина
    // доезжает до экрана результата и до журнала.
    const res = await api.render({ data: project.data, layout: project.layout, format, brand });
    // Черновик тоже переводим на ссылки: иначе при «Изменить → Создать»
    // те же картинки загрузились бы ещё раз.
    setDraft(d => ({ ...d, planImage: data.planImage, bgImage: data.bgImage }));
    return res?.url || null;
  }, [draft, scenario, format, brand]);

  const soon = () => setSheet(
    <>
      <p>Этот сценарий появится в следующем обновлении. Сейчас доступны
         «Объект» и «Крупная цифра».</p>
      <button className="btn ghost si" onClick={() => setSheet(null)}>Понятно</button>
    </>
  );

  const editorMenu = () => setSheet(
    <>
      <button className="si" onClick={() => { setSheet(null); setDraft({ ...BASE_DRAFT, skin: draft.skin }); }}>
        Сбросить данные объекта
      </button>
      <button className="si danger" onClick={() => { setSheet(null); setDraft({ ...BASE_DRAFT }); go("home"); }}>
        Выйти без сохранения
      </button>
    </>
  );

  const chrome = !FULL_SCREEN.includes(route);

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
    <BrandContext.Provider value={brand}>
      {route === "render" ? (
        <RenderPage draft={draft} layout={scenario.layout} work={renderWork}
                    onDone={(url, err) => { setFileUrl(url); setRenderError(err || null); go("result"); }} />
      ) : (
        <div className="screen">
          {chrome && <AppHeader route={route} go={go} />}

          {route === "home" && (
            <HomePage category={category} setCategory={setCategory} projects={projects} go={go}
                      onScenario={openScenario}
                      onTemplate={t => { setDraft(d => ({ ...d, skin: t.skin }));
                                         openScenario(SCENARIOS.find(s => s.layout === t.layout)); }}
                      onOpen={openProject} onSoon={soon} />
          )}

          {route === "editor" && (
            <EditorPage scenario={scenario} draft={draft} setDraft={setDraft} agency={brand.agency}
                        onCreate={() => { setFileUrl(null); setRenderError(null); go("render"); }}
                        onBack={backHome} onMenu={editorMenu}
                        onProfile={() => go("profile")} />
          )}

          {route === "result" && lastProject && (
            <ResultPage project={lastProject} format={format} setFormat={setFormat} fileUrl={fileUrl}
                        error={renderError}
                        onEdit={() => go("editor")}
                        onAgain={() => { setDraft({ ...BASE_DRAFT }); go("home"); }}
                        onSheet={setSheet} />
          )}

          {route === "projects" && (
            <ProjectsPage projects={projects} onOpen={openProject}
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
  );
}
