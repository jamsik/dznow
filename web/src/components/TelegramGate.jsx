import { isMock } from "../lib/api";
import { initDataRaw } from "../lib/telegram";

const BOT = (import.meta.env.VITE_BOT_USERNAME || "").replace(/^@/, "");

/**
 * Вне Telegram у приложения нет подписанного initData, и сервер честно
 * отвечает 401 на каждый запрос. Без этой заслонки приложение открывалось
 * пустым: список проектов молча приходил пустым, а «Создать» падало уже
 * на рендере — по такой картине непонятно, что именно не так.
 *
 * В режиме мока (VITE_API_BASE не задан) заслонки нет: там сервер не нужен,
 * и приложение должно открываться в обычном браузере.
 */
export default function TelegramGate({ children }) {
  if (isMock || initDataRaw()) return children;

  return (
    <div className="errscreen">
      <h1>Откройте через Telegram</h1>
      <p className="msg">
        DZNOW работает внутри Telegram: оттуда приходит подпись, по которой
        сервер понимает, кто вы. В обычной вкладке браузера этой подписи нет.
      </p>
      {BOT && (
        <a className="btn primary" href={`https://t.me/${BOT}`}>
          Открыть бота @{BOT}
        </a>
      )}
    </div>
  );
}
