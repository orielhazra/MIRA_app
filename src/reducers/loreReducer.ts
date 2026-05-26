// Lore state reducer.
import { LoreEntry } from "../types/index";

export interface PendingUpdate {
  id: string;
  category: string;
  title: string;
  to: string;
  from?: string;
  reason?: string;
}

export interface LoreState {
  activeLoreMemory: LoreEntry[];
  pendingUpdates: PendingUpdate[];
  selectedPendingUpdateIds: string[];
  pendingUpdateStatus: "idle" | "extracting" | "ready" | "error";
}

export const loreInitialState: LoreState = {
  activeLoreMemory: [],
  pendingUpdates: [],
  selectedPendingUpdateIds: [],
  pendingUpdateStatus: "idle",
};

// Discriminated Union for Actions
export type LoreAction =
  | { type: "SET_ACTIVE_LORE"; payload: LoreEntry[] }
  | { type: "PRUNE_LORE"; payload: LoreEntry[] }
  | { type: "SET_PENDING_UPDATES"; payload: PendingUpdate[] }
  | { type: "ADD_PENDING_UPDATE"; payload: PendingUpdate }
  | { type: "REMOVE_PENDING_UPDATE"; payload: number }
  | { type: "SELECT_PENDING_UPDATE"; payload: string }
  | { type: "SELECT_ALL_PENDING_UPDATES"; payload: string[] }
  | { type: "CLEAR_SELECTED_PENDING_UPDATES" }
  | { type: "SET_PENDING_UPDATE_STATUS"; payload: LoreState["pendingUpdateStatus"] }
  | { type: "UPDATE_STORY_LORE"; payload: LoreEntry[] }
  | { type: "UPDATE_WORLD_LORE"; payload: LoreEntry[] }
  | { type: "UPDATE_CHARACTER_LORE"; payload: LoreEntry[] }
  | { type: "SAVE_TEMPORARY_LORE"; payload: LoreEntry[] }
  | { type: "CLEAR_TEMPORARY_LORE"; payload: LoreEntry[] };

export function loreReducer(state: LoreState, action: LoreAction): LoreState {
  switch (action.type) {
    case "SET_ACTIVE_LORE":
    case "PRUNE_LORE":
    case "UPDATE_STORY_LORE":
    case "UPDATE_WORLD_LORE":
    case "UPDATE_CHARACTER_LORE":
    case "SAVE_TEMPORARY_LORE":
    case "CLEAR_TEMPORARY_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "SET_PENDING_UPDATES":
      return { ...state, pendingUpdates: action.payload };

    case "ADD_PENDING_UPDATE":
      return { ...state, pendingUpdates: [...state.pendingUpdates, action.payload] };

    case "REMOVE_PENDING_UPDATE":
      return {
        ...state,
        pendingUpdates: state.pendingUpdates.filter((_, i) => i !== action.payload),
      };

    case "SELECT_PENDING_UPDATE":
      return {
        ...state,
        selectedPendingUpdateIds: state.selectedPendingUpdateIds.includes(action.payload)
          ? state.selectedPendingUpdateIds.filter((id) => id !== action.payload)
          : [...state.selectedPendingUpdateIds, action.payload],
      };

    case "SELECT_ALL_PENDING_UPDATES":
      return {
        ...state,
        selectedPendingUpdateIds: action.payload,
      };

    case "CLEAR_SELECTED_PENDING_UPDATES":
      return { ...state, selectedPendingUpdateIds: [] };

    case "SET_PENDING_UPDATE_STATUS":
      return { ...state, pendingUpdateStatus: action.payload };

    default:
      return state;
  }
}
