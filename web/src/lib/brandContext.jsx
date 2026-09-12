import { createContext, useContext } from "react";
import { DEFAULT_PROFILE, brandFrom } from "../data/brand";

/**
 * Бренд доезжает до шаблонов через контекст, а не через пропсы каждого превью:
 * превью встречаются на пяти экранах, и протаскивать логотип через все было бы шумно.
 * Серверный рендер оборачивает макет в тот же провайдер со своими значениями.
 */
export const BrandContext = createContext(brandFrom(DEFAULT_PROFILE));
export const useBrand = () => useContext(BrandContext);
