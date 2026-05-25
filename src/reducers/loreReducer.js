// Lore state reducer.
// Replaces 4 useState blocks: activeLoreMemory, pendingUpdates,
// selectedPendingUpdateIds, pendingUpdateStatus.

export const loreInitialState = {
  activeLoreMemory: [],
  pendingUpdates: [],
  selectedPendingUpdateIds: [],
  pendingUpdateStatus: "idle",
};

export function loreReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "PRUNE_LORE":
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

    case "UPDATE_STORY_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "UPDATE_WORLD_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "UPDATE_CHARACTER_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "SAVE_TEMPORARY_LORE":
      return { ...state, activeLoreMemory: action.payload };

    case "CLEAR_TEMPORARY_LORE":
      return { ...state, activeLoreMemory: action.payload };

    default:
      return state;
  }
}
