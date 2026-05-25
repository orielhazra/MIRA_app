import { useApp } from "./AppContext";

// LoreContext provides lore state, active lorebook, pending updates, and lore actions.

export function useLoreContext() {
  const app = useApp();
  return {
    activeLoreMemory: app.activeLoreMemory,
    loreStatusText: app.loreStatusText,
    isExtractingUpdates: app.isExtractingUpdates,
    pendingUpdates: app.pendingUpdates,
    selectedPendingUpdateIds: app.selectedPendingUpdateIds,
    pendingUpdateStatus: app.pendingUpdateStatus,
    updateStoryLore: app.updateStoryLore,
    updateWorldLore: app.updateWorldLore,
    updateCharacterLore: app.updateCharacterLore,
    saveTemporaryLore: app.saveTemporaryLore,
    clearTemporaryLore: app.clearTemporaryLore,
    refreshActiveLore: app.refreshActiveLore,
    extractStateUpdates: app.extractStateUpdates,
    togglePendingUpdate: app.togglePendingUpdate,
    rejectPendingUpdates: app.rejectPendingUpdates,
    applySelectedPendingUpdates: app.applySelectedPendingUpdates,
    saveDirectorNotes: app.saveDirectorNotes,
    clearDirectorNotes: app.clearDirectorNotes,
    saveCurrentContext: app.saveCurrentContext,
    saveSceneControl: app.saveSceneControl,
    saveStoryMemory: app.saveStoryMemory,
    saveCastState: app.saveCastState,
  };
}
