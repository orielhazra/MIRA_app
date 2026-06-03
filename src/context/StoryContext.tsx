import { useApp } from "./AppContext";

// StoryContext provides story, world, and character state + CRUD actions.
// Components can use useStoryContext() to access the story slice directly.

export function useStoryContext() {
  const app = useApp();
  return {
    storyMetas: app.storyMetas,
    worlds: app.worlds,
    characters: app.characters,
    personas: app.personas,
    activeView: app.activeView,
    selectedCharacterSheetId: app.selectedCharacterSheetId,
    selectedWorldSheetId: app.selectedWorldSheetId,
    storyDraft: app.storyDraft,
    activeStory: app.activeStory,
    activeWorld: app.activeWorld,
    activeStoryCharacters: app.activeStoryCharacters,
    selectedCharacter: app.selectedCharacter,
    selectedWorld: app.selectedWorld,
    selectedPersona: app.selectedPersona,
    getWorld: app.getWorld,
    getCharacter: app.getCharacter,
    isGenerating: app.isGenerating,
    openStoryCreationSheet: app.openStoryCreationSheet,
    switchStory: app.switchStory,
    startStoryFromCreationSheet: app.startStoryFromCreationSheet,
    cancelStoryCreation: app.cancelStoryCreation,
    deleteActiveStory: app.deleteActiveStory,
    createBlankCharacter: app.createBlankCharacter,
    saveCharacterSheetEdits: app.saveCharacterSheetEdits,
    saveStoryCastIdentity: app.saveStoryCastIdentity,
    deleteSelectedCharacter: app.deleteSelectedCharacter,
    setCharacterPresenceInActiveStory: app.setCharacterPresenceInActiveStory,
    addCharacterToActiveStory: app.addCharacterToActiveStory,
    removeCharacterFromActiveStory: app.removeCharacterFromActiveStory,
    createBlankWorld: app.createBlankWorld,
    saveWorldSheetEdits: app.saveWorldSheetEdits,
    deleteSelectedWorld: app.deleteSelectedWorld,
    assignWorldToStory: app.assignWorldToStory,
    createBlankPersona: app.createBlankPersona,
    savePersonaEdits: app.savePersonaEdits,
    deletePersona: app.deletePersona,
    factoryReset: app.factoryReset,
    setActiveView: app.setActiveView,
  };
}
