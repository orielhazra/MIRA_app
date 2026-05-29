import { defaultCharacters, defaultStories, defaultWorlds } from "../constants/defaultData";
import { normalizeCharacter, normalizeStory, normalizeWorld } from "../services/normalizers";
import { storyToMeta } from "../services/storyMeta";

export function createStoryBindings(ctx: any, storyActions: any) {
  return {
    openStoryCreationSheet: () => storyActions.openStoryCreationSheet({
      isGenerating: ctx.isGenerating,
      worlds: ctx.worlds,
      characters: ctx.characters,
      activeWorld: ctx.activeWorld,
      setStoryDraft: ctx.setStoryDraft,
      setActiveView: ctx.setActiveView,
    }),

    switchStory: (storyId: string) => storyActions.switchStory({
      storyId,
      isGenerating: ctx.isGenerating,
      worlds: ctx.worlds,
      characters: ctx.characters,
      repository: ctx.repository,
      setActiveStory: ctx.setActiveStory,
      saveActiveStory: ctx.saveActiveStory,
      removeStoryMeta: ctx.removeStoryMeta,
      setChatHistory: ctx.setChatHistory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setStoryDraft: ctx.setStoryDraft,
      setActiveView: ctx.setActiveView,
    }),

    startStoryFromCreationSheet: (draft: any) => storyActions.startStoryFromCreationSheet({
      draft,
      worlds: ctx.worlds,
      characters: ctx.characters,
      saveActiveStory: ctx.saveActiveStory,
      setActiveStory: ctx.setActiveStory,
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
      clearActiveStorySelection: ctx.clearActiveStorySelection,
      repository: ctx.repository,
      removeStoryMeta: ctx.removeStoryMeta,
    }),

    assignWorldToStory: (worldId: string) => storyActions.assignWorldToStory({
      worldId,
      activeStory: ctx.activeStory,
      characters: ctx.characters,
      getWorld: ctx.getWorld,
      saveActiveStory: ctx.saveActiveStory,
      resetCurrentStoryState: ctx.resetCurrentStoryState,
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setActiveView: ctx.setActiveView,
    }),

    saveCurrentContext: (nextContext?: any) => storyActions.saveCurrentContext({
      activeStory: nextContext && ctx.activeStory ? { ...ctx.activeStory, currentContext: nextContext } : ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
    }),

    saveSceneControl: (nextContext: any, nextDirectorNotes: any) => storyActions.saveSceneControl({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      nextContext,
      nextDirectorNotes,
    }),

    saveStoryMemory: (nextMemory: any) => storyActions.saveStoryMemory({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      nextMemory,
    }),

    saveCastState: (nextCastState: any) => storyActions.saveCastState({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      castMembers: ctx.activeStory?.castMembers || [],
      activeStoryCharacters: ctx.activeStoryCharacters,
      nextCastState,
    }),

    saveDirectorNotes: (notes: any) => storyActions.saveDirectorNotes({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      notes,
    }),

    clearDirectorNotes: () => storyActions.clearDirectorNotes({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
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
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      pendingUpdates: ctx.pendingUpdates,
      selectedPendingUpdateIds: ctx.selectedPendingUpdateIds,
      saveActiveStory: ctx.saveActiveStory,
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

    deleteSelectedCharacter: (characterId: string) => characterActions.deleteSelectedCharacter({
      characters: ctx.characters,
      storyMetas: ctx.storyMetas,
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
      characterId,
      presence,
      getCharacter: ctx.getCharacter,
      saveActiveStory: ctx.saveActiveStory,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
      setActiveView: ctx.setActiveView,
    }),

    addCharacterToActiveStory: (characterId: string) => characterActions.addCharacterToActiveStory({
      activeStory: ctx.activeStory,
      characters: ctx.characters,
      characterId,
      getCharacter: ctx.getCharacter,
      saveActiveStory: ctx.saveActiveStory,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
    }),

    removeCharacterFromActiveStory: (characterId: string) => characterActions.removeCharacterFromActiveStory({
      activeStory: ctx.activeStory,
      characters: ctx.characters,
      characterId,
      getCharacter: ctx.getCharacter,
      saveActiveStory: ctx.saveActiveStory,
      setSelectedCharacterSheetId: ctx.setSelectedCharacterSheetId,
    }),
  };
}

export function createStoryCharacterBindings(ctx: any, storyCharacterActions: any) {
  const deps = {
    activeStory: ctx.activeStory,
    characters: ctx.characters,
    saveActiveStory: ctx.saveActiveStory,
  };
  return {
    updateStoryCharacterPatch: (castMemberId: string, patch: any) => storyCharacterActions.updateStoryCharacterPatch(castMemberId, patch, deps),
    addStoryCharacterLoreEntry: (castMemberId: string, entry: any) => storyCharacterActions.addStoryCharacterLoreEntry(castMemberId, entry, deps),
    updateStoryCharacterLoreEntry: (castMemberId: string, entryId: string, patch: any) => storyCharacterActions.updateStoryCharacterLoreEntry(castMemberId, entryId, patch, deps),
    removeStoryCharacterLoreEntry: (castMemberId: string, entryId: string) => storyCharacterActions.removeStoryCharacterLoreEntry(castMemberId, entryId, deps),
    resetStoryCharacterOverlay: (castMemberId: string) => storyCharacterActions.resetStoryCharacterOverlay(castMemberId, deps),
    upgradeStoryCastMemberTemplate: (castMemberId: string) => storyCharacterActions.upgradeStoryCastMemberTemplate(castMemberId, deps),
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
      setSelectedWorldSheetId: ctx.setSelectedWorldSheetId,
      setActiveView: ctx.setActiveView,
    }),

    deleteSelectedWorld: (worldId: string) => worldActions.deleteSelectedWorld({
      worlds: ctx.worlds,
      storyMetas: ctx.storyMetas,
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
      activeWorld: ctx.activeWorld,
      characters: ctx.characters,
      saveActiveStory: ctx.saveActiveStory,
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
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),

    saveTemporaryLore: (lorebook: any[]) => loreActions.saveTemporaryLore({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      lorebook,
      story: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      characters: ctx.characters,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),

    clearTemporaryLore: () => loreActions.clearTemporaryLore({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      story: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      characters: ctx.characters,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),

    refreshActiveLore: () => loreActions.refreshActiveLore({
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      activeStoryCharacters: ctx.activeStoryCharacters,
      chatHistory: ctx.chatHistory,
      activeLoreMemory: ctx.activeLoreMemory,
      setActiveLoreMemory: ctx.setActiveLoreMemory,
      saveLoreForActiveStory: ctx.saveLoreForActiveStory,
    }),
  };
}


export function createStoryWorldBindings(ctx: any, storyWorldActions: any) {
  return {
    updateStoryWorldPatch: (patch: any) => storyWorldActions.updateStoryWorldPatch({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      patch,
    }),

    addStoryWorldLocation: (location: any) => storyWorldActions.addStoryWorldLocation({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      location,
    }),

    updateStoryWorldLocation: (locationId: string, patch: any) => storyWorldActions.updateStoryWorldLocation({
      activeStory: ctx.activeStory,
      activeWorld: ctx.activeWorld,
      saveActiveStory: ctx.saveActiveStory,
      locationId,
      patch,
    }),

    removeStoryWorldLocation: (locationId: string) => storyWorldActions.removeStoryWorldLocation({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      locationId,
    }),

    addStoryWorldLoreEntry: (loreEntry: any) => storyWorldActions.addStoryWorldLoreEntry({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      loreEntry,
    }),

    updateStoryWorldLoreEntry: (entryId: string, patch: any) => storyWorldActions.updateStoryWorldLoreEntry({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      entryId,
      patch,
    }),

    removeStoryWorldLoreEntry: (entryId: string) => storyWorldActions.removeStoryWorldLoreEntry({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      entryId,
    }),

    resetStoryWorldOverlay: () => storyWorldActions.resetStoryWorldOverlay({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
    }),

    upgradeStoryWorldTemplate: () => storyWorldActions.upgradeStoryWorldTemplate({
      activeStory: ctx.activeStory,
      saveActiveStory: ctx.saveActiveStory,
      worlds: ctx.worlds,
    }),
  };
}

export function createImportExportBindings(ctx: any, importExport: any) {
  return {
    exportCharacter: (character?: any) => importExport.exportCharacter({
      character: character || ctx.selectedCharacter || undefined,
    }),

    exportWorld: (world?: any) => importExport.exportWorld({
      world: world || ctx.selectedWorld || undefined,
    }),

    exportActiveStory: () => importExport.exportActiveStory({
      activeStory: ctx.activeStory || undefined,
      getWorld: ctx.getWorld,
      getStoryCharacters: ctx.getStoryCharacters,
      chatHistory: ctx.chatHistory,
    }),

    handleImportStoryFile: (event: any) => importExport.handleImportFile(event, (parsed: any) => {
      importExport.importStoryBundle?.({
        parsed,
        worlds: ctx.worlds,
        characters: ctx.characters,
        saveWorldList: ctx.saveWorldList,
        saveCharacterList: ctx.saveCharacterList,
        saveActiveStory: ctx.saveActiveStory,
        setActiveStory: ctx.setActiveStory,
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

      ctx.repository.maintenance.clearKnownData([], ctx.characters);

      const nextWorlds = defaultWorlds.map(normalizeWorld);
      const nextCharacters = defaultCharacters.map((character) => normalizeCharacter(character));
      const nextStories = defaultStories.map((story) => normalizeStory(story, nextWorlds, nextCharacters));
      const nextStoryMetas = nextStories.map(storyToMeta);

      ctx.dispatchStory({ type: "FACTORY_RESET", payload: { worlds: nextWorlds, characters: nextCharacters, storyMetas: nextStoryMetas } });
      ctx.repository.worlds.saveAll(nextWorlds);
      ctx.repository.characters.saveAll(nextCharacters);
      ctx.repository.stories.clear();
      for (const story of nextStories) ctx.repository.stories.saveStory(story);

      ctx.setChatHistory([]);
      ctx.setActiveLoreMemory([]);
      ctx.dispatchLore({ type: "RESET_PENDING_UPDATES" });
      ctx.repository.activeStory.clear();
    },
  };
}
