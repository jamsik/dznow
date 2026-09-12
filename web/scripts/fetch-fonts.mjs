/**
 * Кладёт шрифты внутрь приложения.
 *
 * Зачем. Рендер-воркер открывает страницу макета в Chromium на сервере и
 * ждёт, пока шрифты загрузятся, — иначе в кадр попадёт системный шрифт
 * вместо фирменного. Пока шрифты берутся с fonts.googleapis.com, это поход
 * по сети из серверной стойки, и он занимает столько, сколько занимает.
 * С сервера в России — иногда десятки секунд.
 *
 * Скрипт скачивает нужные начертания один раз на сборке образа и пишет
 * web/public/fonts/fonts.css со ссылками на свои файлы. После этого рендер
 * в интернет за шрифтами не ходит вообще.
 *
 * Ничего не вышло (нет сети, Google недоступен) — скрипт молча выходит,
 * оставив прежний fonts.css с обращением к Google. Сборка не падает:
 * лучше медленные шрифты, чем несобравшийся образ.
 *
 * Запуск:  node scripts/fetch-fonts.mjs   (из папки web)
 */
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

// Начертания ровно те, что встречаются в макетах и интерфейсе.
// Лишние тянуть незачем: каждое — отдельный файл в образе.
const FAMILIES = [
  ["Onest", [400, 500, 600, 700, 800]],          // интерфейс и текст макетов
  ["IBM Plex Mono", [400, 500]],                 // цены, площади, платежи
  ["Montserrat", [400, 500, 600, 700]],
  ["Golos Text", [400, 500, 600, 700]],
  ["Rubik", [400, 500, 600, 700]],
  ["Unbounded", [600, 700]],
  ["Oswald", [500, 600, 700]],
  ["Playfair Display", [600, 700, 800]],
  ["Cormorant Garamond", [600, 700]],
  ["PT Serif", [400, 700]]
];

// Только кириллица и базовая латиница. Греческий, вьетнамский и прочее
// в макетах про новостройки не пригодится, а вес добавляет.
const KEEP_SUBSETS = /^(cyrillic|cyrillic-ext|latin|latin-ext)$/;

// Без этого Google отдаёт ttf вместо woff2 — он вчетверо тяжелее.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const OUT_DIR = join(process.cwd(), "public", "fonts");
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function cssFor(family, weights) {
  const url = "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family).replace(/%20/g, "+") +
    ":wght@" + weights.join(";") + "&display=swap";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${family}: css ${res.status}`);
  return res.text();
}

/** Разбирает ответ Google на блоки @font-face вместе с именем поднабора. */
function parseFaces(css) {
  const faces = [];
  // Перед каждым блоком Google ставит комментарий с названием поднабора.
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const [, subset, body] = m;
    const pick = re2 => (body.match(re2) || [])[1];
    const src = pick(/src:\s*url\(([^)]+)\)/);
    if (!src) continue;
    faces.push({
      subset,
      weight: pick(/font-weight:\s*(\d+)/) || "400",
      style: pick(/font-style:\s*(\w+)/) || "normal",
      range: pick(/unicode-range:\s*([^;]+)/) || "",
      url: src.replace(/['"]/g, "")
    });
  }
  return faces;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const blocks = [];
  const files = new Set();

  for (const [family, weights] of FAMILIES) {
    const faces = parseFaces(await cssFor(family, weights))
      .filter(f => KEEP_SUBSETS.test(f.subset));
    if (!faces.length) throw new Error(`${family}: подходящих начертаний не нашлось`);

    for (const f of faces) {
      const name = `${slug(family)}-${f.weight}-${f.subset}.woff2`;
      if (!files.has(name)) {
        const res = await fetch(f.url, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`${name}: ${res.status}`);
        await writeFile(join(OUT_DIR, name), Buffer.from(await res.arrayBuffer()));
        files.add(name);
      }
      blocks.push(
        `@font-face{font-family:'${family}';font-style:${f.style};` +
        `font-weight:${f.weight};font-display:swap;` +
        `src:url('/fonts/${name}') format('woff2');` +
        (f.range ? `unicode-range:${f.range};` : "") + `}`
      );
    }
    process.stdout.write(`  ${family}: ${faces.length} начертаний\n`);
  }

  // Файлы от прошлой сборки, которые больше не нужны.
  for (const old of await readdir(OUT_DIR)) {
    if (old.endsWith(".woff2") && !files.has(old)) await unlink(join(OUT_DIR, old));
  }

  await writeFile(join(OUT_DIR, "fonts.css"),
    "/* Собрано scripts/fetch-fonts.mjs. Руками не править — перезапишется. */\n" +
    blocks.join("\n") + "\n");

  console.log(`Шрифты внутри приложения: ${files.size} файлов.`);
}

main().catch(err => {
  console.warn("Шрифты остаются внешними:", err.message);
  console.warn("Это не ошибка сборки, но рендер будет ходить за ними в Google.");
  process.exit(0);
});
