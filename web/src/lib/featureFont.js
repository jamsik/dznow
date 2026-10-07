import { api } from "./api";

let loading;

/** Circe is fetched only after the server grants access to this template. */
export function loadFeatureFont() {
  if (!loading) {
    loading = Promise.all(["400", "700"].map(async weight => ({
      weight, url: URL.createObjectURL(await api.featureFont(weight))
    }))).then(async files => {
      const style = document.createElement("style");
      style.textContent = files.map(({ weight, url }) =>
        `@font-face{font-family:"Circe";src:url("${url}") format("woff2");font-style:normal;font-weight:${weight};font-display:swap}`
      ).join("\n");
      document.head.append(style);
      await Promise.all(["400", "700"].map(weight => document.fonts.load(`${weight} 16px "Circe"`, "Текст 123")));
    }).catch(error => { loading = null; throw error; });
  }
  return loading;
}
