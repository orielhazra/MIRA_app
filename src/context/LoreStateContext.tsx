/**
 * LoreStateContext — manages active lore memory, pending updates, and lore status.
 *
 * Extracted from useAppManager as part of the context split (Task 5.1).
 * Owns the loreReducer.
 *
 * Does NOT own saveLoreForActiveStory (which needs activeStory.id from story state).
 * That remains in useAppManager.
 */

import { createContext, useContext, useMemo, useReducer } from "react";
import type { LoreEntry } from "../types";
import { loreReducer, loreInitialState, type PendingUpdate } from "../reducers/loreReducer";

interface LoreStateContextValue {
  activeLoreMemory: LoreEntry[];
  pendingUpdates: PendingUpdate[];
  selectedPendingUpdateIds: string[];
  pendingUpdateStatus: string;
  loreStatusText: string;

  setActiveLoreMemory: (memory: LoreEntry[]) => void;
  setPendingUpdates: (updates: PendingUpdate[]) => void;
  setSelectedPendingUpdateIds: (ids: string[]) => void;
  setPendingUpdateStatus: (status: string) => void;
  resetPendingUpdates: () => void;
}

const LoreStateContext = createContext<LoreStateContextValue | null>(null);

interface LoreStateProviderProps {
  initialLoreMemory?: LoreEntry[];
  children: React.ReactNode;
}

export function LoreStateProvider({ initialLoreMemory = [], children }: LoreStateProviderProps) {
  const [loreState, dispatchLore] = useReducer(loreReducer, {
    ...loreInitialState,
    activeLoreMemory: initialLoreMemory,
    pendingUpdates: [],
    selectedPendingUpdateIds: [],
    pendingUpdateStatus: "",
  });

  const { activeLoreMemory, pendingUpdates, selectedPendingUpdateIds, pendingUpdateStatus } = loreState;

  const loreStatusText = useMemo(
    () => activeLoreMemory.length
      ? `Lore: ${activeLoreMemory.map((entry) => [entry.source, entry.name].filter(Boolean).join(": ")).join(", ")}`
      : "Lore: none",
    [activeLoreMemory]
  );

  const setActiveLoreMemory = (memory: LoreEntry[]) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: memory });
  const setPendingUpdates = (updates: PendingUpdate[]) => dispatchLore({ type: "SET_PENDING_UPDATES", payload: updates });
  const setSelectedPendingUpdateIds = (ids: string[]) => dispatchLore({ type: "SET_SELECTED_PENDING_UPDATE_IDS", payload: ids });
  const setPendingUpdateStatus = (status: string) => dispatchLore({ type: "SET_PENDING_UPDATE_STATUS", payload: status });
  const resetPendingUpdates = () => dispatchLore({ type: "RESET_PENDING_UPDATES" });

  return (
    <LoreStateContext.Provider value={{
      activeLoreMemory, pendingUpdates, selectedPendingUpdateIds, pendingUpdateStatus, loreStatusText,
      setActiveLoreMemory, setPendingUpdates, setSelectedPendingUpdateIds, setPendingUpdateStatus, resetPendingUpdates,
    }}>
      {children}
    </LoreStateContext.Provider>
  );
}

export function useLoreState(): LoreStateContextValue {
  const context = useContext(LoreStateContext);
  if (!context) throw new Error("useLoreState must be used within a LoreStateProvider");
  return context;
}
