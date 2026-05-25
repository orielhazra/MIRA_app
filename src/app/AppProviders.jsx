import { AppContext } from "../context/AppContext.jsx";
import useAppManager from "../hooks/useAppManager.js";

export default function AppProviders({ children }) {
  const app = useAppManager();
  return (
    <AppContext.Provider value={app}>
      {children}
    </AppContext.Provider>
  );
}
