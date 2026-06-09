/**
 * UIContext — manages panel collapse state, debug modal, loading indicators,
 * persistence status, settings, and confirmation dialogs.
 *
 * This is pure UI/settings state with no dependencies on story/chat/lore state.
 * Extracted from useAppManager as part of the context split (Task 5.1).
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { repository, isTauri } from "../services/repository";
import { DEFAULT_KOBOLD_BASE_URL } from "../constants/defaultData";
import { readAppConfig, writeAppConfig, getCachedDatabasePath, loadDatabasePath } from "../services/appConfig";
import type { PersistenceStatus } from "../services/storage/persistenceTracker";

export interface PendingConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "default";
  confirmLabel: string;
  action: () => void;
}

interface UIContextValue {
  // Panel collapse
  sidebarCollapsed: boolean;
  editorCollapsed: boolean;
  topbarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  toggleEditorCollapsed: () => void;
  toggleTopbarCollapsed: () => void;

  // Debug + loading
  debugOpen: boolean;
  isLoadingStory: boolean;
  setDebugOpen: (open: boolean) => void;
  setIsLoadingStory: (loading: boolean) => void;

  // Persistence / settings
  persistenceInfo: PersistenceStatus;
  koboldBaseUrl: string;
  storageModeLabel: string;
  storageTargetLabel: string;
  databasePath: string;
  saveKoboldBaseUrl: (url: string) => Promise<void>;
  saveDatabasePath: (path: string) => Promise<void>;
  clearPersistenceError: () => void;
  flushPersistence: () => Promise<void>;

  // Confirmation dialog
  pendingConfirm: PendingConfirmState | null;
  setPendingConfirm: (confirm: PendingConfirmState | null) => void;
  dismissConfirm: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

function readLocalFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "true";
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Panel collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readLocalFlag("mira_sidebar_collapsed"));
  const [editorCollapsed, setEditorCollapsed] = useState(() => readLocalFlag("mira_editor_collapsed"));
  const [topbarCollapsed, setTopbarCollapsed] = useState(() => readLocalFlag("mira_topbar_collapsed"));
  const [debugOpen, setDebugOpen] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false);

  // Persistence / settings
  const [persistenceInfo, setPersistenceInfo] = useState<PersistenceStatus>(
    () => repository.persistence?.getStatus?.() ?? { lastError: null, lastOperation: null, lastSavedAt: null, pendingWrites: 0 }
  );
  const [koboldBaseUrl, setKoboldBaseUrlState] = useState(
    () => { try { return repository.settings.getKoboldBaseUrl(DEFAULT_KOBOLD_BASE_URL); } catch { return DEFAULT_KOBOLD_BASE_URL; } }
  );

  // Confirmation dialog
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmState | null>(null);
  const dismissConfirm = useCallback(() => setPendingConfirm(null), []);

  // localStorage sync
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("mira_sidebar_collapsed", String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("mira_editor_collapsed", String(editorCollapsed)); }, [editorCollapsed]);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("mira_topbar_collapsed", String(topbarCollapsed)); }, [topbarCollapsed]);

  // Persistence subscription
  useEffect(() => {
    const unsubscribe = repository.persistence?.subscribe?.((status: PersistenceStatus) => {
      setPersistenceInfo(status);
    });
    return () => { unsubscribe?.(); };
  }, []);

  const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed((v) => !v), []);
  const toggleEditorCollapsed = useCallback(() => setEditorCollapsed((v) => !v), []);
  const toggleTopbarCollapsed = useCallback(() => setTopbarCollapsed((v) => !v), []);

  const saveKoboldBaseUrl = useCallback(async (value: string) => {
    const normalized = value.trim() || DEFAULT_KOBOLD_BASE_URL;
    setKoboldBaseUrlState(normalized);
    repository.settings.setKoboldBaseUrl(normalized);
    await repository.persistence?.flush?.();
  }, []);

  const clearPersistenceError = useCallback(() => {
    repository.persistence?.clearError?.();
  }, []);

  const flushPersistence = useCallback(async () => {
    await repository.persistence?.flush?.();
  }, []);

  const [databasePath, setDatabasePath] = useState(() => getCachedDatabasePath());

  // Load the database path from config on mount (async)
  useEffect(() => {
    loadDatabasePath().then((path) => setDatabasePath(path));
  }, []);

  const saveDatabasePath = useCallback(async (path: string) => {
    const normalized = path.trim();
    const config = await readAppConfig();
    await writeAppConfig({ ...config, databasePath: normalized || undefined });
    setDatabasePath(normalized);
  }, []);

  const storageModeLabel = isTauri ? "SQLite (Tauri)" : "LocalStorage (Browser fallback)";
  const storageTargetLabel = isTauri
    ? (databasePath || "sqlite:mira.db (App Data)")
    : "Browser local storage";

  return (
    <UIContext.Provider value={{
      sidebarCollapsed, editorCollapsed, topbarCollapsed,
      toggleSidebarCollapsed, toggleEditorCollapsed, toggleTopbarCollapsed,
      debugOpen, setDebugOpen, isLoadingStory, setIsLoadingStory,
      persistenceInfo, koboldBaseUrl, storageModeLabel, storageTargetLabel, databasePath,
      saveKoboldBaseUrl, saveDatabasePath, clearPersistenceError, flushPersistence,
      pendingConfirm, setPendingConfirm, dismissConfirm,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
}
