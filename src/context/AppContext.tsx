import { createContext, useContext, ReactNode } from "react";

interface AppContextValue {
  // This will be populated by useAppManager return value
  [key: string]: any;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}

export { AppContext };
