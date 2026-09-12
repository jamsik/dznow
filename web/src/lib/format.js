const nf = new Intl.NumberFormat("ru-RU");
const nf1 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export const group = v => nf.format(Math.round(v || 0));
export const num = v => nf1.format(isFinite(v) ? v : 0);
export const money = v => group(v) + " ₽";
export const short = v =>
  v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 2).replace(".", ",") + " млн ₽" : money(v);

/** Аннуитетный платёж — то, ради чего риэлтор обычно лезет в калькулятор. */
export function annuity({ price, down, rate, term }) {
  const loan = price * (1 - down / 100);
  const i = rate / 100 / 12;
  const n = term * 12;
  if (loan <= 0 || n <= 0) return 0;
  return i <= 0 ? loan / n : (loan * i) / (1 - Math.pow(1 + i, -n));
}

export function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? forms[2] : b > 1 && b < 5 ? forms[1] : b === 1 ? forms[0] : forms[2];
}

export function whenLabel(ts) {
  const d = new Date(ts), t = new Date();
  const hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  if (d.toDateString() === t.toDateString()) return "Сегодня, " + hm;
  if (new Date(t.getTime() - 864e5).toDateString() === d.toDateString()) return "Вчера, " + hm;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ", " + hm;
}

export function relTime(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "изменено только что";
  if (m < 60) return `изменено ${m} ${plural(m, ["минуту", "минуты", "минут"])} назад`;
  const h = Math.round(m / 60);
  if (h < 10) return `изменено ${h} ${plural(h, ["час", "часа", "часов"])} назад`;
  return whenLabel(ts);
}
