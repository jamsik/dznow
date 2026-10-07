import { createContext, useContext } from "react";

// null means standalone rendering or an admin preview; the Mini App supplies
// the server's current template settings once the catalog has loaded.
export const LayoutSettingsContext = createContext(null);
export const useLayoutSettings = () => useContext(LayoutSettingsContext);
