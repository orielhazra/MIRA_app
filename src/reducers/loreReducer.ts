// Lore state reducer.
import { LoreEntry } from "../types/index";

export interface PendingUpdate {
  id: string;
  category: string;
  title: string;
  to: string;
  from?: string;
  reason?: string;
  target?: string;
  details?: string;
  confidence?: number | null;
}

export interface LoreState {
  activeLoreMemory: LoreEntry[];
  pendingUpdates: PendingUpdate[];
  selectedPendingUpdateIds: string[];
  pendingUpdateStatus: string;
}

export const loreInitialState: LoreState = {
  activeLoreMemory: [],
  pendingUpdates: [],
  selectedPendingUpdateIds: [],
  pendingUpdateStatus: "",
};

export type LoreAction =
  | { type: "SET_ACTIVE_LORE"; payload: LoreEntry[] }
  | { type: "SET_PENDING_UPDATES"; payload: PendingUpdate[] }
  | { type: "SET_SELECTED_PENDING_UPDATE_IDS"; payload: string[] }
  | { type: "TOGGLE_PENDING_UPDATE"; payload: string }
  | { type: "SET_PENDING_UPDATE_STATUS"; payload: string }
  | { type: "RESET_PENDING_UPDATES" };

export function loreReducer(state: LoreState, action: LoreAction): LoreState {
  switch (action.type) {
    case "SET_ACTIVE_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "SET_PENDING_UPDATES":
      return { ...state, pendingUpdates: action.payload };

    case "SET_SELECTED_PENDING_UPDATE_IDS":
      return { ...state, selectedPendingUpdateIds: action.payload };

    case "TOGGLE_PENDING_UPDATE":
      return {
        ...state,
        selectedPendingUpdateIds: state.selectedPendingUpdateIds.includes(action.payload)
          ? state.selectedPendingUpdateIds.filter((id) => id !== action.payload)
          : [...state.selectedPendingUpdateIds, action.payload],
      };

    case "SET_PENDING_UPDATE_STATUS":
      return { ...state, pendingUpdateStatus: action.payload };

    case "RESET_PENDING_UPDATES":
      return {
        ...state,
        pendingUpdates: [],
        selectedPendingUpdateIds: [],
        pendingUpdateStatus: "",
      };

    default:
      return state;
  }
}
