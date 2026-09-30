import { api } from "./api";

const WEIGHTS = ["400", "500", "700", "900"];
let loading;

/** Files stay on the server; only the authorized user's browser receives them. */
export function loadSamoletFont() {
  if (!loading) {
    loading = Promise.all(WEIGHTS.map(async weight => {
      const file = await api.samoletFont(weight);
      return { weight, url: URL.createObjectURL(file) };
    })).then(async files => {
      const style = document.createElement("style");
      style.textContent = files.map(({ weight, url }) =>
        `@font-face{font-family:"CoFo Sans";src:url("${url}") format("woff2");font-style:normal;font-weight:${weight};font-display:swap}`
      ).join("\n");
      document.head.append(style);
      await Promise.all(WEIGHTS.map(weight => document.fonts.load(`${weight} 16px "CoFo Sans"`, "ЖК 123")));
    }).catch(error => {
      loading = null;
      throw error;
    });
  }
  return loading;
}
