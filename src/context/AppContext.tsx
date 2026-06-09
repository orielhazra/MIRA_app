import { createContext, useContext } from "react";
import type { AppContextValue } from "../types/appContext";

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}

export { AppContext };
