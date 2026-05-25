// useStoryManager.js
// Hook that manages story CRUD, switching, and active story derivation.
// Extracted from App.jsx.
//
// State managed:
//   stories[], activeStoryId, storyDraft
//
// Actions:
//   openStoryCreationSheet, startStoryFromCreationSheet, cancelStoryCreation
//   switchStory, deleteActiveStory
//   saveStoryList, saveCastState, saveSceneControl
//   saveCurrentContext, saveStoryMemory, saveDirectorNotes
//   addCharacterToActiveStory, removeCharacterFromActiveStory
//   assignWorldToStory, factoryReset
//
// Depends on: repository, normalizers
