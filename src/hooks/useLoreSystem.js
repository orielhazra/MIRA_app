// useLoreSystem.js
// Hook that manages lore injection, active lore memory, and lorebook updates.
// Extracted from App.jsx.
//
// State managed:
//   activeLoreMemory[]
//
// Actions:
//   updateStoryLore, updateWorldLore, updateCharacterLore
//   saveTemporaryLore, clearTemporaryLore
//   refreshActiveLore, pruneAndSaveLore
//
// Depends on: lore.js (getCombinedRuntimeLorebook, inspectLoreInjection, pruneActiveLoreMemory)
// Depends on: normalizers, repository
