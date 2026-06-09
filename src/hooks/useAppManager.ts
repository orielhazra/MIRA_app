import { useRef, useState } from "react";
import { ChatMessage, StoryCastMember, Character, World, Persona, Story, StoryMeta, LoreEntry } from "../types";
import { repository } from "../services/repository";
import { defaultStories, createEmptyCharacterOverlay } from "../constants/defaultData";
import { normalizeStory, normalizePersona } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { storyToMeta } from "../services/storyMeta";
import {
  createInitialCastState,
  createInitialCurrentContext,
} from "../utils/appHelpers";
import useGeneration, { type GenerationDeps } from "./useGeneration";
import useChatActions from "./useChatActions";
import useStoryActions from "./useStoryActions";
import useCharacterActions from "./useCharacterActions";
import useWorldActions from "./useWorldActions";
import useStoryWorldActions from "./useStoryWorldActions";
import useLoreActions from "./useLoreActions";
import useStateUpdates from "./useStateUpdates";
import useImportExport from "./useImportExport";
import useStoryCharacterActions from "./useStoryCharacterActions";
import {
  createStoryBindings,
  createChatBindings,
  createStateUpdateBindings,
  createCharacterBindings,
  createWorldBindings,
  createLoreBindings,
  createStoryWorldBindings,
  createImportExportBindings,
  createMaintenanceBindings,
  createStoryCharacterBindings,
} from "./useAppManagerBindings";
import { createId } from "../utils/helpers";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";
import { useChatState } from "../context/ChatStateContext";
import { useLoreState } from "../context/LoreStateContext";
import { useStoryState } from "../context/StoryStateContext";

export default function useAppManager() {
  const { showToast } = useToast();

  // Story state is managed by StoryStateContext
  const {
    worlds, characters, personas, storyMetas, activeStory, activeView,
    selectedCharacterSheetId, selectedWorldSheetId, storyDraft,
    activeWorld, activeStoryCharacters, selectedCharacter, selectedWorld, selectedPersona,
    setActiveView, setSelectedCharacterSheetId, setSelectedWorldSheetId, setStoryDraft, setActiveStory,
    saveWorldList, saveCharacterList, savePersonaList, saveStoryMetas, upsertStoryMeta, removeStoryMeta,
    getWorld, getCharacter, getStoryCharacters, saveActiveStory, dispatchStory,
  } = useStoryState();

  // Chat + generation state is managed by ChatStateContext
  const {
    chatHistory, editingMessageIndex, setChatHistory, setEditingMessageIndex,
    isGenerating, promptTokens, generationStatus, progressPercent, isExtractingUpdates,
    setIsGenerating, setPromptTokens, setGenerationStatus, setProgressPercent, setIsExtractingUpdates,
  } = useChatState();

  // Lore state is managed by LoreStateContext
  const {
    activeLoreMemory, pendingUpdates, selectedPendingUpdateIds, pendingUpdateStatus, loreStatusText,
    setActiveLoreMemory, setPendingUpdates, setSelectedPendingUpdateIds, setPendingUpdateStatus, resetPendingUpdates,
  } = useLoreState();

  const storyImportRef = useRef<HTMLInputElement>(null);
  const characterImportRef = useRef<HTMLInputElement>(null);
  const worldImportRef = useRef<HTMLInputElement>(null);

  // UI + settings + persistence + confirm state is managed by UIContext
  const {
    sidebarCollapsed, toggleSidebarCollapsed,
    editorCollapsed, toggleEditorCollapsed,
    topbarCollapsed, toggleTopbarCollapsed,
    debugOpen, setDebugOpen,
    isLoadingStory, setIsLoadingStory,
    persistenceInfo, koboldBaseUrl, storageModeLabel, storageTargetLabel, databasePath,
    saveKoboldBaseUrl, saveDatabasePath, clearPersistenceError, flushPersistence,
    pendingConfirm, setPendingConfirm, dismissConfirm,
  } = useUI();



  const generation = useGeneration();
  const storyActions = useStoryActions();
  const characterActions = useCharacterActions();
  const worldActions = useWorldActions();
  const storyWorldActions = useStoryWorldActions();
  const loreActions = useLoreActions();
  const stateUpdates = useStateUpdates();
  const importExport = useImportExport();
  const storyCharacterActions = useStoryCharacterActions();


  // New setter for active story











  const saveChatForActiveStory = (nextChatHistory: ChatMessage[]) => {
    if (!activeStory) return;
    repository.chats.save(activeStory.id, nextChatHistory);
  };

  const saveLoreForActiveStory = (nextLoreMemory: LoreEntry[]) => {
    if (!activeStory) return;
    repository.loreMemory.save(activeStory.id, nextLoreMemory);
  };



  const clearActiveStorySelection = () => {
    dispatchStory({ type: "CLEAR_ACTIVE_STORY" });
    setChatHistory([]);
    setActiveLoreMemory([]);
    setStoryDraft(null);
    resetPendingUpdates();
    repository.activeStory.clear();
  };

  const deleteStoryById = (storyId: string) => {
    if (!storyId) return;
    const meta = storyMetas.find((item) => item.id === storyId);
    const label = meta?.title || "this story";
    setPendingConfirm({
      open: true,
      title: "Delete Story",
      message: `Delete story "${label}"? This will delete its chat and lore memory.`,
      variant: "danger",
      confirmLabel: "Delete",
      action: () => {
        repository.stories.deleteStory?.(storyId);
        repository.maintenance?.removeStoryRuntimeData?.(storyId);
        removeStoryMeta(storyId);
        if (activeStory?.id === storyId) clearActiveStorySelection();
        setPendingConfirm(null);
      },
    });
  };

  const openStoryEditSheet = async (storyId: string) => {
    if (isGenerating) {
      showToast("Please wait for the current reply to finish before editing stories.");
      return;
    }
    setIsLoadingStory(true);
    try {
      let loadedStory = await repository.stories.loadFull(storyId);
      if (!loadedStory) {
        const defaultStory = defaultStories.find((story: { id: string }) => story.id === storyId);
        if (defaultStory) {
          loadedStory = normalizeStory(defaultStory, worlds, characters);
        }
      }
      if (!loadedStory) {
        const meta = storyMetas.find((storyMeta) => storyMeta.id === storyId);
        if (meta) {
          const world = worlds.find((item) => item.id === meta.templateWorldId) || worlds[0] || null;
          loadedStory = normalizeStory({
            id: meta.id,
            title: meta.title,
            templateWorldId: meta.templateWorldId || world?.id || "",
            castMembers: [],
            greeting: "The scene begins.",
            createdAt: meta.createdAt || Date.now(),
            lastPlayedAt: meta.lastPlayedAt,
          }, worlds, characters);
        }
      }
      if (!loadedStory) {
        showToast("Story not found.");
        removeStoryMeta(storyId);
        return;
      }
      repository.stories.saveStory(loadedStory);
      upsertStoryMeta(storyToMeta(loadedStory));
      setStoryDraft(normalizeStory(loadedStory, worlds, characters));
      setActiveView("story-edit");
    } finally {
      setIsLoadingStory(false);
    }
  };

  const saveStoryEdits = (storyDraft: Story) => {
    if (!storyDraft) return { error: "No story draft is loaded." };
    if (!storyDraft.templateWorldId || !worlds.some((world) => world.id === storyDraft.templateWorldId)) {
      return { error: "Please choose a valid world." };
    }
    const castMembers = Array.isArray(storyDraft.castMembers) ? storyDraft.castMembers : [];
    if (!castMembers.length) return { error: "Please choose at least one story character." };

    const selectedIdSet = new Set(castMembers.map((m: StoryCastMember) => m.id));
    const prunedDraft = {
      ...storyDraft,
      castState: {
        activeCharacters: (storyDraft.castState?.activeCharacters || []).filter((row: { castMemberId: string }) => selectedIdSet.has(row.castMemberId)),
        relationships: (storyDraft.castState?.relationships || []).filter((row: { castMemberId: string }) => selectedIdSet.has(row.castMemberId)),
      },
      storyMemory: {
        ...storyDraft.storyMemory,
        characterJournals: Object.fromEntries(
          Object.entries(storyDraft.storyMemory?.characterJournals || {}).filter(([id]) => selectedIdSet.has(id))
        )
      }
    };
    const normalizedStory = normalizeStory(prunedDraft, worlds, characters);
    repository.stories.saveStory(normalizedStory);
    upsertStoryMeta(storyToMeta(normalizedStory));
    if (activeStory?.id === normalizedStory.id) setActiveStory(normalizedStory);
    setStoryDraft(null);
    setActiveView("landing");
    return { ok: true };
  };

  const cancelStoryEdit = () => {
    setStoryDraft(null);
    setActiveView("landing");
  };

  const createBlankPersona = () => {
    if (isGenerating) return;
    const next = normalizePersona({ id: createId("persona"), name: "New Persona" });
    savePersonaList([...personas, next]);
    setSelectedCharacterSheetId(next.id);
    setActiveView("persona");
  };

  const savePersonaEdits = (draft: Persona) => {
    savePersonaList(personas.map(p => p.id === draft.id ? draft : p));
  };

  const deletePersona = (id: string) => {
    setPendingConfirm({
      open: true,
      title: "Delete Persona",
      message: "Delete this persona? This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      action: () => {
        savePersonaList(personas.filter(p => p.id !== id));
        setActiveView("landing");
        setPendingConfirm(null);
      },
    });
  };

  const resetCurrentStoryState = (
    storyId = activeStory?.id,
    story = activeStory,
    world = activeWorld,
    storyCharacters = activeStoryCharacters
  ) => {
    if (!storyId || !story || !world) return;
    const cast = (storyCharacters?.length ? storyCharacters : getStoryCharacters(story)).filter(Boolean);
    const opening: ChatMessage[] = [{ role: "assistant", content: buildOpeningMessage(story, world, cast) }];
    setActiveLoreMemory([]);
    repository.loreMemory.save(storyId, []);
    setChatHistory(opening);
    repository.chats.save(storyId, opening);
    resetPendingUpdates();
  };

  const runGeneration = (overrides: Pick<GenerationDeps, "visibleHistory" | "promptHistory" | "finalBuilder" | "privateInstruction">) =>
    generation.generateAssistantReply({
      ...overrides,
      activeStory,
      activeWorld,
      activeStoryCharacters,
      activeLoreMemory,
      setChatHistory,
      saveChatForActiveStory,
      setActiveLoreMemory,
      saveLoreForActiveStory,
      setIsGenerating,
      setEditingMessageIndex,
      setPromptTokens,
      setGenerationStatus,
      setProgressPercent,
      isGenerating,
    });

  const chatActions = useChatActions({ generateAssistantReply: runGeneration });

  const managerContext = {
    repository,
    dispatchStory,
    worlds,
    characters,
    personas,
    storyMetas,
    activeStory,
    activeView,
    selectedCharacterSheetId,
    selectedWorldSheetId,
    storyDraft,
    debugOpen,
    chatHistory,
    editingMessageIndex,
    activeLoreMemory,
    pendingUpdates,
    selectedPendingUpdateIds,
    pendingUpdateStatus,
    isGenerating,
    persistenceInfo,
    koboldBaseUrl,
    storageModeLabel,
    storageTargetLabel,
    databasePath,
    sidebarCollapsed,
    editorCollapsed,
    topbarCollapsed,
    promptTokens,
    generationStatus,
    progressPercent,
    isExtractingUpdates,
    activeWorld,
    activeStoryCharacters,
    selectedCharacter,
    selectedWorld,
    selectedPersona,
    saveKoboldBaseUrl,
    saveDatabasePath,
    clearPersistenceError,
    flushPersistence,
    toggleSidebarCollapsed,
    toggleEditorCollapsed,
    toggleTopbarCollapsed,
    setStoryDraft,
    setActiveView,
    setSelectedCharacterSheetId,
    setSelectedWorldSheetId,
    setDebugOpen,
    setActiveStory,
    setChatHistory,
    setEditingMessageIndex,
    setActiveLoreMemory,
    setPendingUpdates,
    setSelectedPendingUpdateIds,
    setPendingUpdateStatus,
    resetPendingUpdates,
    setIsGenerating,
    setPromptTokens,
    setGenerationStatus,
    setProgressPercent,
    setIsExtractingUpdates,
    saveWorldList,
    saveCharacterList,
    savePersonaList,
    saveStoryMetas,
    upsertStoryMeta,
    removeStoryMeta,
    saveActiveStory,
    saveChatForActiveStory,
    saveLoreForActiveStory,
    getWorld,
    getCharacter,
    getStoryCharacters,
    clearActiveStorySelection,
    deleteStoryById,
    openStoryEditSheet,
    saveStoryEdits,
    cancelStoryEdit,
    resetCurrentStoryState,
    createBlankPersona,
    savePersonaEdits,
    deletePersona,
    setPendingConfirm,
    isLoadingStory,
    setIsLoadingStory,
  };

  const storyBindings = createStoryBindings(managerContext, storyActions);
  const chatBindings = createChatBindings(managerContext, chatActions, generation);
  const stateUpdateBindings = createStateUpdateBindings(managerContext, stateUpdates);
  const characterBindings = createCharacterBindings(managerContext, characterActions);
  const worldBindings = createWorldBindings(managerContext, worldActions);
  const storyWorldBindings = createStoryWorldBindings(managerContext, storyWorldActions);
  const loreBindings = createLoreBindings(managerContext, loreActions);
  const importExportBindings = createImportExportBindings(managerContext, importExport);
  const maintenanceBindings = createMaintenanceBindings(managerContext);
  const storyCharacterBindings = createStoryCharacterBindings(managerContext, storyCharacterActions);

  return {
    abortControllerRef: generation.abortControllerRef,
    activeLoreMemory,
    activeStory,
    activeStoryCharacters,
    activeView,
    activeWorld,
    characterImportRef,
    characters,
    personas,
    chatHistory,
    debugOpen,
    editingMessageIndex,
    generationStatus,
    getCharacter,
    getStoryCharacters,
    getWorld,
    isExtractingUpdates,
    isGenerating,
    loreStatusText,
    pendingUpdateStatus,
    pendingUpdates,
    progressPercent,
    persistenceInfo,
    koboldBaseUrl,
    storageModeLabel,
    storageTargetLabel,
    databasePath,
    sidebarCollapsed,
    editorCollapsed,
    topbarCollapsed,
    promptTokens,
    selectedCharacter,
    selectedCharacterSheetId,
    selectedPendingUpdateIds,
    selectedWorld,
    selectedWorldSheetId,
    selectedPersona,
    setActiveView,
    setDebugOpen,
    setSelectedCharacterSheetId,
    setSelectedWorldSheetId,
    saveKoboldBaseUrl,
    saveDatabasePath,
    clearPersistenceError,
    flushPersistence,
    toggleSidebarCollapsed,
    toggleEditorCollapsed,
    toggleTopbarCollapsed,
    setStoryDraft,
    saveActiveStory,
    deleteStoryById,
    openStoryEditSheet,
    saveStoryEdits,
    cancelStoryEdit,
    storyMetas,
    storyDraft,
    storyImportRef,
    worldImportRef,
    worlds,
    createBlankPersona,
    savePersonaEdits,
    deletePersona,
    pendingConfirm,
    dismissConfirm,
    isLoadingStory,
    ...storyBindings,
    ...chatBindings,
    ...stateUpdateBindings,
    ...characterBindings,
    ...worldBindings,
    ...storyWorldBindings,
    ...loreBindings,
    ...importExportBindings,
    ...maintenanceBindings,
    ...storyCharacterBindings,
  };
}
