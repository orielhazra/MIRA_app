import React from "react";
import { AppContext } from "../context/AppContext";
import useAppManager from "../hooks/useAppManager";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const app = useAppManager();
  return (
    <AppContext.Provider value={app}>
      {children}
    </AppContext.Provider>
  );
}
