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
import { api } from "./lib/api";
import { brandFrom, initials } from "./data/brand";
import { loadProfile, saveProfile } from "./lib/profile";
import { BrandContext } from "./lib/brandContext";
import { BASE_DRAFT, SCENARIOS } from "./data/catalog";
import { initTelegram, telegramUser, useTelegramBack } from "./lib/telegram";

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
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    initTelegram();
    // Имя из Telegram подставляем только в пустой профиль, чтобы не затирать
    // то, что человек ввёл руками.
    const tgUser = telegramUser();
    if (tgUser) {
      setProfile(p => {
        if (p.firstName || p.lastName) return p;
        const [first, ...rest] = tgUser.name.split(" ");
        return { ...p, firstName: first || "", lastName: rest.join(" ") };
      });
    }
    api.listProjects().then(setProjects).catch(() => {});
  }, []);

  // профиль живёт на устройстве и сохраняется при каждом изменении
  useEffect(() => { saveProfile(profile); }, [profile]);

  const brand = useMemo(() => brandFrom(profile), [profile]);
  const avatarUser = useMemo(
    () => ({ initials: initials(profile) }),
    [profile]
  );

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
    const project = {
      id: "p" + Date.now(),
      title: draft.complex,
      scenario: scenario.id,
      layout: scenario.layout,
      at: Date.now(),
      // planSource — исходник до обработки, нужен только редактору;
      // в хранилище и на сервер уходит уже готовая картинка
      data: { ...draft, planSource: null }
    };
    setLastProject(project);
    await api.saveProject(project).catch(() => {});
    api.listProjects().then(setProjects).catch(() => {});
    const res = await api.render({ data: project.data, layout: project.layout, format, brand })
      .catch(() => null);
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

  return (
    <BrandContext.Provider value={brand}>
      {route === "render" ? (
        <RenderPage draft={draft} layout={scenario.layout} work={renderWork}
                    onDone={url => { setFileUrl(url); go("result"); }} />
      ) : (
        <div className="screen">
          {chrome && <AppHeader route={route} go={go} user={avatarUser} />}

          {route === "home" && (
            <HomePage category={category} setCategory={setCategory} projects={projects} go={go}
                      onScenario={openScenario}
                      onTemplate={t => { setDraft(d => ({ ...d, skin: t.skin }));
                                         openScenario(SCENARIOS.find(s => s.layout === t.layout)); }}
                      onOpen={openProject} onSoon={soon} />
          )}

          {route === "editor" && (
            <EditorPage scenario={scenario} draft={draft} setDraft={setDraft} agency={brand.agency}
                        onCreate={() => { setFileUrl(null); go("render"); }}
                        onBack={backHome} onMenu={editorMenu}
                        onProfile={() => go("profile")} />
          )}

          {route === "result" && lastProject && (
            <ResultPage project={lastProject} format={format} setFormat={setFormat} fileUrl={fileUrl}
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
