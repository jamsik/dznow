import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorScreen from "./components/ErrorScreen";
import TelegramGate from "./components/TelegramGate";
import { installLogHooks } from "./lib/log";
// Локальные шрифты: раскомментировать после tools\fetch-fonts.ps1
// import "./styles/fonts.css";
import "./styles/app.css";
import "./styles/story.css";

// Ставим до первого рендера: иначе ошибка на старте пройдёт мимо журнала.
installLogHooks();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorScreen>
      <TelegramGate>
        <App />
      </TelegramGate>
    </ErrorScreen>
  </StrictMode>
);
