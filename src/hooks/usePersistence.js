// usePersistence.js
// Hook that wraps repository.js for auto-save / debounced persistence.
// Centralizes all localStorage reads and writes.
//
// Actions:
//   loadInitialState() — called once on mount
//   saveWorldList, saveCharacterList, saveStoryList
//   saveChatForActiveStory, saveLoreForActiveStory
//
// Depends on: repository, normalizers
// Future: replace localStorage with IndexedDB (Dexie)
