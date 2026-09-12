import { defineConfig } from "vite";
import { resolve } from "path";

// JSX компилируется встроенным esbuild (jsx: "automatic"), поэтому
// @vitejs/plugin-react не нужен — на одну зависимость меньше.
// Если понадобится Fast Refresh, ставится он и добавляется в plugins.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  build: {
    rollupOptions: {
      input: {
        // index.html  — само приложение (Telegram Mini App)
        // render.html — «голая» страница с одним макетом 1080×1920,
        //               её открывает рендер-воркер и снимает скриншот
        main: resolve(__dirname, "index.html"),
        render: resolve(__dirname, "render.html")
      }
    }
  },
  server: {
    // strictPort: без него Vite при занятом 5173 молча уходит на 5174,
    // и мимо цели бьют сразу двое — запускатор и рендер-воркер (RENDER_URL).
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:8010",
      "/files": "http://127.0.0.1:8010"
    }
  }
});
