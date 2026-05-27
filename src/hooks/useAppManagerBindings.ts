import { defaultCharacters, defaultStories, defaultWorlds } from "../constants/defaultData";
import { normalizeCharacter, normalizeStory, normalizeWorld } from "../services/normalizers";

export function createStoryBindings(ctx: any, storyActions: any) {
  return {
    openStoryCreationSheet: () => storyActions.openStoryCreationSheet({
      isGenerating: ctx.isGenerating,
      worlds: ctx.worlds,
      characters: ctx.characters,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      setStoryDraft: ctx.setStoryDraft,
      setActiveView: ctx.setActiveView,
    }),

    switchStory: (storyId: string) => storyActions.switchStory({
      storyId,
      isGenerating: ctx.isGenerating,
      stories: ctx.stories,
      worlds: ctx.worlds,
      characters: ctx.characters,
      setActiveStoryId: ctx.setActiveStoryId,
      setChatHistory: ctx.setChatHistory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      repository: ctx.repository,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setStoryDraft: ctx.setStoryDraft,
      setActiveView: ctx.setActiveView,
    }),

    startStoryFromCreationSheet: (draft: any) => storyActions.startStoryFromCreationSheet({
      draft,
      worlds: ctx.worlds,
      characters: ctx.characters,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      setActiveStoryId: ctx.setActiveStoryId,
      repository: ctx.repository,
      setChatHistory: ctx.setChatHistory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setStoryDraft: ctx.setStoryDraft,
      setActiveView: ctx.setActiveView,
    }),

    cancelStoryCreation: () => storyActions.cancelStoryCreation({
      activeStory: ctx.activeStory,
      setStoryDraft: ctx.setStoryDraft,
      setActiveView: ctx.setActiveView,
    }),

    deleteActiveStory: () => storyActions.deleteActiveStory({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      clearActiveStorySelection: ctx.clearActiveStorySelection,
      repository: ctx.repository,
    }),

    assignWorldToStory: (worldId: string) => storyActions.assignWorldToStory({
      worldId,
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      worlds: ctx.worlds,
      characters: ctx.characters,
      getWorld: ctx.getWorld,
      saveStoryList: ctx.saveStoryList,
      resetCurrentStoryState: ctx.resetCurrentStoryState,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setActiveView: ctx.setActiveView,
    }),

    saveCurrentContext: (nextContext?: any) => storyActions.saveCurrentContext({
      activeStory: nextContext && ctx.activeStory ? { ...ctx.activeStory, currentContext: nextContext } : ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
    }),

    saveSceneControl: (nextContext: any, nextDirectorNotes: any) => storyActions.saveSceneControl({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      nextContext,
      nextDirectorNotes,
    }),

    saveStoryMemory: (nextMemory: any) => storyActions.saveStoryMemory({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      nextMemory,
    }),

    saveCastState: (nextCastState: any) => storyActions.saveCastState({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      activeStoryCharacters: ctx.activeStoryCharacters,
      nextCastState,
    }),

    saveDirectorNotes: (notes: any) => storyActions.saveDirectorNotes({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      notes,
    }),

    clearDirectorNotes: () => storyActions.clearDirectorNotes({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
    }),
  };
}

export function createChatBindings(ctx: any, chatActions: any, generation: any) {
  return {
    sendMessage: (text: string) => chatActions.sendMessage({
      text,
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    continueLastReply: () => chatActions.continueLastReply({
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    elaborateLastReply: () => chatActions.elaborateLastReply({
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    rerollLastReply: () => chatActions.rerollLastReply({
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    regenerateFromMessage: (index: number) => chatActions.regenerateFromMessage({
      index,
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    rollbackLastExchange: () => chatActions.rollbackLastExchange({
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    resetChat: () => chatActions.resetChat({
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
      resetCurrentStoryState: ctx.resetCurrentStoryState,
    }),

    startEditingMessage: (index: number) => chatActions.startEditingMessage({
      index,
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
      setEditingMessageIndex: ctx.setEditingMessageIndex,
    }),

    cancelMessageEdit: () => chatActions.cancelMessageEdit({
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
      setEditingMessageIndex: ctx.setEditingMessageIndex,
    }),

    saveMessageEdit: (index: number, newText: string, regenerateAfterSave = false) => chatActions.saveMessageEdit({
      index,
      newText,
      regenerateAfterSave,
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
      setEditingMessageIndex: ctx.setEditingMessageIndex,
    }),

    deleteMessagesFromIndex: (index: number) => chatActions.deleteMessagesFromIndex({
      index,
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
      setEditingMessageIndex: ctx.setEditingMessageIndex,
    }),

    selectAssistantOption: (messageIndex: number, optionIndex: number) => chatActions.selectAssistantOption({
      messageIndex,
      optionIndex,
      chatHistory: ctx.chatHistory,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setChatHistory: ctx.setChatHistory,
    }),

    cancelGeneration: () => generation.cancelGeneration(),

    retryLastGeneration: () => generation.retryLastGeneration({
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      activeStoryCharacters: ctx.activeStoryCharacters,
      activeLoreMemory: ctx.activeLoreMemory,
      setChatHistory: ctx.setChatHistory,
      saveChatForActiveStory: ctx.saveChatForActiveStory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
      setIsGenerating: ctx.setIsGenerating,
      setEditingMessageIndex: ctx.setEditingMessageIndex,
      setPromptTokens: ctx.setPromptTokens,
      setGenerationStatus: ctx.setGenerationStatus,
      setProgressPercent: ctx.setProgressPercent,
      isGenerating: ctx.isGenerating,
    } as any),
  };
}

export function createStateUpdateBindings(ctx: any, stateUpdates: any) {
  return {
    extractStateUpdates: () => stateUpdates.extractStateUpdates({
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      isGenerating: ctx.isGenerating,
      isExtractingUpdates: ctx.isExtractingUpdates,
      chatHistory: ctx.chatHistory,
      setIsExtractingUpdates: ctx.setIsExtractingUpdates,
      setPendingUpdateStatus: ctx.setPendingUpdateStatus,
      setPendingUpdates: ctx.setPendingUpdates,
      setSelectedPendingUpdateIds: ctx.setSelectedPendingUpdateIds,
    }),

    togglePendingUpdate: (updateId: string) => stateUpdates.togglePendingUpdate({
      updateId,
      selectedPendingUpdateIds: ctx.selectedPendingUpdateIds,
      setSelectedPendingUpdateIds: ctx.setSelectedPendingUpdateIds,
    }),

    rejectPendingUpdates: () => stateUpdates.rejectPendingUpdates({
      setPendingUpdates: ctx.setPendingUpdates,
      setSelectedPendingUpdateIds: ctx.setSelectedPendingUpdateIds,
      setPendingUpdateStatus: ctx.setPendingUpdateStatus,
    }),

    applySelectedPendingUpdates: () => stateUpdates.applySelectedPendingUpdates({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      pendingUpdates: ctx.pendingUpdates,
      selectedPendingUpdateIds: ctx.selectedPendingUpdateIds,
      saveStoryList: ctx.saveStoryList,
      setPendingUpdates: ctx.setPendingUpdates,
      setSelectedPendingUpdateIds: ctx.setSelectedPendingUpdateIds,
      setPendingUpdateStatus: ctx.setPendingUpdateStatus,
    }),
  };
}

export function createCharacterBindings(ctx: any, characterActions: any) {
  return {
    createBlankCharacter: () => characterActions.createBlankCharacter({
      isGenerating: ctx.isGenerating,
      worlds: ctx.worlds,
      characters: ctx.characters,
      selectedWorldSheetId: ctx.selectedWorldSheetId,
      activeWorld: ctx.activeWorld,
      saveCharacterList: ctx.saveCharacterList,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setActiveView: ctx.setActiveView,
      setStoryDraft: ctx.setStoryDraft,
    }),

    saveCharacterSheetEdits: (characterDraft: any) => characterActions.saveCharacterSheetEdits({
      characterDraft,
      characters: ctx.characters,
      worlds: ctx.worlds,
      saveCharacterList: ctx.saveCharacterList,
    }),

    saveStoryCastIdentity: (characterDraft: any) => characterActions.saveStoryCastIdentity({
      characterDraft,
      characters: ctx.characters,
      worlds: ctx.worlds,
      saveCharacterList: ctx.saveCharacterList,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
    }),

    deleteSelectedCharacter: (characterId: string) => characterActions.deleteSelectedCharacter({
      characters: ctx.characters,
      stories: ctx.stories,
      characterId,
      getCharacter: ctx.getCharacter,
      saveCharacterList: ctx.saveCharacterList,
      repository: ctx.repository,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setActiveView: ctx.setActiveView,
    }),

    setCharacterPresenceInActiveStory: (characterId: string, presence: string) => characterActions.setCharacterPresenceInActiveStory({
      activeStory: ctx.activeStory,
      characters: ctx.characters,
      stories: ctx.stories,
      characterId,
      presence,
      getCharacter: ctx.getCharacter,
      saveStoryList: ctx.saveStoryList,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setActiveView: ctx.setActiveView,
    }),

    addCharacterToActiveStory: (characterId: string) => characterActions.addCharacterToActiveStory({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      characterId,
      getCharacter: ctx.getCharacter,
      saveStoryList: ctx.saveStoryList,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
    }),

    removeCharacterFromActiveStory: (characterId: string) => characterActions.removeCharacterFromActiveStory({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      characterId,
      getCharacter: ctx.getCharacter,
      saveStoryList: ctx.saveStoryList,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
    }),
  };
}

export function createWorldBindings(ctx: any, worldActions: any) {
  return {
    createBlankWorld: () => worldActions.createBlankWorld({
      isGenerating: ctx.isGenerating,
      worlds: ctx.worlds,
      saveWorldList: ctx.saveWorldList,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setActiveView: ctx.setActiveView,
      setStoryDraft: ctx.setStoryDraft,
    }),

    saveWorldSheetEdits: (worldDraft: any) => worldActions.saveWorldSheetEdits({
      worldDraft,
      worlds: ctx.worlds,
      saveWorldList: ctx.saveWorldList,
    }),

    deleteSelectedWorld: (worldId: string) => worldActions.deleteSelectedWorld({
      worlds: ctx.worlds,
      stories: ctx.stories,
      worldId,
      getWorld: ctx.getWorld,
      saveWorldList: ctx.saveWorldList,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setActiveView: ctx.setActiveView,
    }),
  };
}

export function createLoreBindings(ctx: any, loreActions: any) {
  return {
    updateStoryLore: (index: number, patch: any) => loreActions.updateStoryLore({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      characters: ctx.characters,
      saveStoryList: ctx.saveStoryList,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
      index,
      patch,
      story: ctx.activeStory,
    }),

    updateWorldLore: (index: number, patch: any) => loreActions.updateWorldLore({
      activeWorld: ctx.activeWorld,
      worlds: ctx.worlds,
      saveWorldList: ctx.saveWorldList,
      activeStory: ctx.activeStory,
      activeCharacter: ctx.activeCharacter,
      characters: ctx.characters,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
      index,
      patch,
    }),

    updateCharacterLore: (characterId: string, index: number, patch: any) => loreActions.updateCharacterLore({
      characterId,
      index,
      patch,
      characters: ctx.characters,
      saveCharacterList: ctx.saveCharacterList,
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),

    saveTemporaryLore: (lorebook: any[]) => loreActions.saveTemporaryLore({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      lorebook,
      story: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      characters: ctx.characters,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),

    clearTemporaryLore: () => loreActions.clearTemporaryLore({
      activeStory: ctx.activeStory,
      stories: ctx.stories,
      saveStoryList: ctx.saveStoryList,
      story: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      characters: ctx.characters,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),

    refreshActiveLore: () => loreActions.refreshActiveLore({
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeCharacter: ctx.activeCharacter,
      activeStoryCharacters: ctx.activeStoryCharacters,
      chatHistory: ctx.chatHistory,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),
  };
}

export function createImportExportBindings(ctx: any, importExport: any) {
  return {
    exportCharacter: (character?: any) => importExport.exportCharacter({
      character: character || ctx.selectedCharacter || ctx.activeCharacter || undefined,
    }),

    exportWorld: (world?: any) => importExport.exportWorld({
      world: world || ctx.selectedWorld || ctx.activeWorld || undefined,
    }),

    exportActiveStory: () => importExport.exportActiveStory({
      activeStory: ctx.activeStory || undefined,
      getWorld: ctx.getWorld,
      getStoryCharacters: ctx.getStoryCharacters,
      chatHistory: ctx.chatHistory,
      activeStoryId: ctx.activeStoryId,
    }),

    handleImportStoryFile: (event: any) => importExport.handleImportFile(event, (parsed: any) => {
      importExport.importStoryBundle?.({
        parsed,
        worlds: ctx.worlds,
        characters: ctx.characters,
        stories: ctx.stories,
        saveWorldList: ctx.saveWorldList,
        saveCharacterList: ctx.saveCharacterList,
        saveStoryList: ctx.saveStoryList,
        setActiveStoryId: ctx.setActiveStoryId,
        repository: ctx.repository,
        setChatHistory: ctx.setChatHistory,
        setActiveLoreMemory: ctx.setActiveLoreMemory,
        setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
        setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
        setStoryDraft: ctx.setStoryDraft,
        setActiveView: ctx.setActiveView,
      });
    }),

    handleImportCharacterFile: (event: any) => importExport.handleImportFile(event, (parsed: any) => {
      importExport.importCharacterBundle?.({
        parsed,
        worlds: ctx.worlds,
        characters: ctx.characters,
        saveCharacterList: ctx.saveCharacterList,
        setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
        setActiveView: ctx.setActiveView,
      });
    }),

    handleImportWorldFile: (event: any) => importExport.handleImportFile(event, (parsed: any) => {
      importExport.importWorldBundle?.({
        parsed,
        worlds: ctx.worlds,
        saveWorldList: ctx.saveWorldList,
        setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
        setActiveView: ctx.setActiveView,
      });
    }),
  };
}

export function createMaintenanceBindings(ctx: any) {
  return {
    factoryReset: () => {
      if (ctx.isGenerating) return;
      if (!confirm("This will delete saved stories, characters, worlds, chats, and lore memory. Continue?")) return;

      ctx.repository.maintenance.clearKnownData(ctx.stories, ctx.characters);

      const nextWorlds = defaultWorlds.map(normalizeWorld);
      const nextCharacters = defaultCharacters.map((character) => normalizeCharacter(character, nextWorlds));
      const nextStories = defaultStories.map((story) => normalizeStory(story, nextWorlds, nextCharacters));

      ctx.dispatchStory({ type: "FACTORY_RESET", payload: { worlds: nextWorlds, characters: nextCharacters, stories: nextStories } });
      ctx.repository.worlds.saveAll(nextWorlds);
      ctx.repository.characters.saveAll(nextCharacters);
      ctx.repository.stories.saveAll(nextStories);

      ctx.setChatHistory([]);
      ctx.setActiveLoreMemory([]);
      ctx.dispatchLore({ type: "RESET_PENDING_UPDATES" });
      ctx.repository.activeStory.clear();
    },
  };
}
