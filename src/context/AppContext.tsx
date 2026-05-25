import { createContext, useContext } from "react";

const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}

export { AppContext };
