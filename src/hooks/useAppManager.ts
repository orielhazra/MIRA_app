import { useEffect, useMemo, useRef, useReducer, useState } from "react";
import { ChatMessage, StoryCastMember } from "../types";
import { DEFAULT_KOBOLD_BASE_URL, CUSTOM_DB_PATH, defaultStories, createEmptyCharacterOverlay } from "../constants/defaultData";
import { normalizeCharacter, normalizeStory, normalizeWorld } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { repository, isTauri } from "../services/repository";
import { resolveEffectiveWorld } from "../services/storyWorld";
import { storyToMeta } from "../services/storyMeta";
import {
  chooseActiveCastLead,
  loadInitialState,
  getStoryCharactersFromLists,
  createInitialCastState,
  createInitialCurrentContext,
} from "../utils/appHelpers";
import { storyReducer, storyInitialState } from "../reducers/storyReducer";
import { chatReducer, chatInitialState } from "../reducers/chatReducer";
import { loreReducer, loreInitialState } from "../reducers/loreReducer";
import { generationReducer, generationInitialState } from "../reducers/generationReducer";
import useGeneration from "./useGeneration";
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

export default function useAppManager() {
  const initial = useMemo(loadInitialState, []);

  const [storyState, dispatchStory] = useReducer(storyReducer, {
    ...storyInitialState,
    worlds: initial.worlds,
    characters: initial.characters,
    storyMetas: initial.storyMetas || [],
    activeStory: initial.activeStory || null,
    activeView: initial.activeView,
    selectedCharacterSheetId: initial.selectedCharacterSheetId,
    selectedWorldSheetId: initial.selectedWorldSheetId,
    storyDraft: null,
    debugOpen: false,
  });

  const [chatState, dispatchChat] = useReducer(chatReducer, {
    ...chatInitialState,
    chatHistory: initial.chatHistory,
    editingMessageIndex: null,
  });

  const [loreState, dispatchLore] = useReducer(loreReducer, {
    ...loreInitialState,
    activeLoreMemory: initial.activeLoreMemory,
    pendingUpdates: [],
    selectedPendingUpdateIds: [],
    pendingUpdateStatus: "",
  });

  const [generationState, dispatchGeneration] = useReducer(generationReducer, {
    ...generationInitialState,
    isGenerating: false,
    promptTokens: "-- tokens",
    generationStatus: "Idle",
    progressPercent: 0,
    isExtractingUpdates: false,
  });

  const {
    worlds,
    characters,
    storyMetas,
    activeStory,
    activeView,
    selectedCharacterSheetId,
    selectedWorldSheetId,
    storyDraft,
    debugOpen,
  } = storyState;
  const { chatHistory, editingMessageIndex } = chatState;
  const { activeLoreMemory, pendingUpdates, selectedPendingUpdateIds, pendingUpdateStatus } = loreState;
  const { isGenerating, promptTokens, generationStatus, progressPercent, isExtractingUpdates } = generationState;

  const storyImportRef = useRef<HTMLInputElement>(null);
  const characterImportRef = useRef<HTMLInputElement>(null);
  const worldImportRef = useRef<HTMLInputElement>(null);

  const [persistenceInfo, setPersistenceInfo] = useState(
    () => repository.persistence?.getStatus?.() || { lastError: null, lastOperation: null, lastSavedAt: null, pendingWrites: 0 }
  );
  const [koboldBaseUrl, setKoboldBaseUrlState] = useState(
    () => repository.settings.getKoboldBaseUrl(DEFAULT_KOBOLD_BASE_URL)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("mira_sidebar_collapsed") === "true";
  });
  const [editorCollapsed, setEditorCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("mira_editor_collapsed") === "true";
  });
  const [topbarCollapsed, setTopbarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("mira_topbar_collapsed") === "true";
  });

  const activeWorld = useMemo(
    () => (activeStory ? resolveEffectiveWorld(activeStory, worlds) || worlds[0] || null : worlds[0] || null),
    [worlds, activeStory]
  );
  const activeStoryCharacters = useMemo(
    () => (activeStory ? getStoryCharactersFromLists(activeStory, characters) : characters[0] ? [characters[0]] : []),
    [activeStory, characters]
  );
  const activeCharacter = useMemo(
    () => chooseActiveCastLead(activeStory, activeStoryCharacters) || characters[0] || null,
    [activeStory, activeStoryCharacters, characters]
  );
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterSheetId) || characters[0] || null,
    [characters, selectedCharacterSheetId]
  );
  const selectedWorld = useMemo(
    () => worlds.find((world) => world.id === selectedWorldSheetId) || worlds[0] || null,
    [worlds, selectedWorldSheetId]
  );

  useEffect(() => {
    const unsubscribe = repository.persistence?.subscribe?.((status: any) => {
      setPersistenceInfo(status);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mira_sidebar_collapsed", String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mira_editor_collapsed", String(editorCollapsed));
    }
  }, [editorCollapsed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mira_topbar_collapsed", String(topbarCollapsed));
    }
  }, [topbarCollapsed]);

  const loreStatusText = activeLoreMemory.length
    ? `Lore: ${activeLoreMemory.map((entry) => [entry.source, entry.name].filter(Boolean).join(": ")).join(", ")}`
    : "Lore: none";

  const generation = useGeneration();
  const storyActions = useStoryActions();
  const characterActions = useCharacterActions();
  const worldActions = useWorldActions();
  const storyWorldActions = useStoryWorldActions();
  const loreActions = useLoreActions();
  const stateUpdates = useStateUpdates();
  const importExport = useImportExport();
  const storyCharacterActions = useStoryCharacterActions();

  const setStoryDraft = (draft: any) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft });
  const setActiveView = (view: string) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view });
  const setSelectedCharacterSheetId = (id: string) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id });
  const setSelectedWorldSheetId = (id: string) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id });
  const setDebugOpen = (open: boolean) => dispatchStory({ type: "SET_DEBUG_OPEN", payload: open });

  // New setter for active story
  const setActiveStory = (story: any) => dispatchStory({ type: "SET_ACTIVE_STORY", payload: story });

  const setChatHistory = (history: any[]) => dispatchChat({ type: "SET_HISTORY", payload: history });
  const setEditingMessageIndex = (index: number | null) => {
    if (index === null) dispatchChat({ type: "CANCEL_EDITING" });
    else dispatchChat({ type: "START_EDITING", payload: index });
  };

  const setActiveLoreMemory = (memory: any[]) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: memory });
  const setPendingUpdates = (updates: any[]) => dispatchLore({ type: "SET_PENDING_UPDATES", payload: updates });
  const setSelectedPendingUpdateIds = (ids: string[]) => dispatchLore({ type: "SET_SELECTED_PENDING_UPDATE_IDS", payload: ids });
  const setPendingUpdateStatus = (status: string) => dispatchLore({ type: "SET_PENDING_UPDATE_STATUS", payload: status });

  const setIsGenerating = (value: boolean) => {
    if (value) dispatchGeneration({ type: "START_GENERATION" });
    else dispatchGeneration({ type: "SET_IS_GENERATING", payload: false });
  };
  const setPromptTokens = (value: string | number) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: value });
  const setGenerationStatus = (status: string) => dispatchGeneration({ type: "SET_STATUS", payload: status });
  const setProgressPercent = (percent: number) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent });
  const setIsExtractingUpdates = (value: boolean) => dispatchGeneration({ type: "SET_IS_EXTRACTING_UPDATES", payload: value });

  const saveWorldList = (nextWorlds: any[]) => {
    const normalizedWorlds = nextWorlds.map((world) => normalizeWorld(world));
    dispatchStory({ type: "SAVE_WORLDS", payload: normalizedWorlds });
    repository.worlds.saveAll(normalizedWorlds);
  };

  const saveCharacterList = (nextCharacters: any[]) => {
    const normalizedCharacters = nextCharacters.map((character) => normalizeCharacter(character));
    dispatchStory({ type: "SAVE_CHARACTERS", payload: normalizedCharacters });
    repository.characters.saveAll(normalizedCharacters);
  };

  const saveStoryMetas = (nextMetas: any[]) => {
    dispatchStory({ type: "SET_STORY_METAS", payload: nextMetas });
  };

  const upsertStoryMeta = (meta: any) => {
    dispatchStory({ type: "UPSERT_STORY_META", payload: meta });
  };

  const removeStoryMeta = (storyId: string) => {
    dispatchStory({ type: "REMOVE_STORY_META", payload: storyId });
  };

  const saveActiveStory = (nextStory: any) => {
    if (!nextStory) return;
    const normalizedStory = normalizeStory(nextStory, worlds, characters);
    dispatchStory({ type: "SET_ACTIVE_STORY", payload: normalizedStory });
    dispatchStory({ type: "UPSERT_STORY_META", payload: storyToMeta(normalizedStory) });
    repository.stories.saveStory(normalizedStory);
  };

  const saveChatForActiveStory = (nextChatHistory: any[]) => {
    if (!activeStory) return;
    repository.chats.save(activeStory.id, nextChatHistory);
  };

  const saveLoreForActiveStory = (nextLoreMemory: any[]) => {
    if (!activeStory) return;
    repository.loreMemory.save(activeStory.id, nextLoreMemory);
  };

  const saveKoboldBaseUrl = async (value: string) => {
    const normalized = value.trim() || DEFAULT_KOBOLD_BASE_URL;
    setKoboldBaseUrlState(normalized);
    repository.settings.setKoboldBaseUrl(normalized);
    await repository.persistence?.flush?.();
  };

  const clearPersistenceError = () => {
    repository.persistence?.clearError?.();
  };

  const flushPersistence = async () => {
    await repository.persistence?.flush?.();
  };

  const storageModeLabel = isTauri ? "SQLite (Tauri)" : "LocalStorage (Browser fallback)";
  const storageTargetLabel = isTauri
    ? (CUSTOM_DB_PATH.trim() || "sqlite:mira.db")
    : "Browser local storage";

  const toggleSidebarCollapsed = () => setSidebarCollapsed((value) => !value);
  const toggleEditorCollapsed = () => setEditorCollapsed((value) => !value);

  const toggleTopbarCollapsed = () => setTopbarCollapsed((value) => !value);

  const getWorld = (id: string) => worlds.find((world) => world.id === id) || null;
  const getCharacter = (id: string) => characters.find((character) => character.id === id) || null;
  const getStoryCharacters = (story: any) => getStoryCharactersFromLists(story, characters);

  const clearActiveStorySelection = () => {
    dispatchStory({ type: "CLEAR_ACTIVE_STORY" });
    setChatHistory([]);
    setActiveLoreMemory([]);
    setStoryDraft(null);
    dispatchLore({ type: "RESET_PENDING_UPDATES" });
    repository.activeStory.clear();
  };

  const deleteStoryById = (storyId: string) => {
    if (!storyId) return;
    const meta = storyMetas.find((item) => item.id === storyId);
    const label = meta?.title || "this story";
    if (!confirm(`Delete story "${label}"? This will delete its chat and lore memory.`)) return;
    repository.stories.deleteStory?.(storyId);
    repository.maintenance?.removeStoryRuntimeData?.(storyId);
    removeStoryMeta(storyId);
    if (activeStory?.id === storyId) clearActiveStorySelection();
  };

  const openStoryEditSheet = async (storyId: string) => {
    if (isGenerating) {
      alert("Please wait for the current reply to finish before editing stories.");
      return;
    }
    let loadedStory = await repository.stories.loadFull(storyId);
    if (!loadedStory) {
      const defaultStory = defaultStories.find((story: any) => story.id === storyId);
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
      alert("Story not found.");
      removeStoryMeta(storyId);
      return;
    }
    repository.stories.saveStory(loadedStory);
    upsertStoryMeta(storyToMeta(loadedStory));
    setStoryDraft(normalizeStory(loadedStory, worlds, characters));
    setActiveView("story-edit");
  };

  const saveStoryEdits = (storyDraft: any) => {
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
        activeCharacters: (storyDraft.castState?.activeCharacters || []).filter((row: any) => selectedIdSet.has(row.castMemberId)),
        relationships: (storyDraft.castState?.relationships || []).filter((row: any) => selectedIdSet.has(row.castMemberId)),
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

  const resetCurrentStoryState = (
    storyId = activeStory?.id,
    story = activeStory,
    world = activeWorld,
    storyCharacters = activeStoryCharacters
  ) => {
    if (!storyId || !story || !world) return;
    const cast = (storyCharacters?.length ? storyCharacters : getStoryCharacters(story)).filter(Boolean);
    const lead = chooseActiveCastLead(story, cast);
    const opening: ChatMessage[] = [{ role: "assistant", content: buildOpeningMessage(story, lead, world, cast) }];
    setActiveLoreMemory([]);
    repository.loreMemory.save(storyId, []);
    setChatHistory(opening);
    repository.chats.save(storyId, opening);
    dispatchLore({ type: "RESET_PENDING_UPDATES" });
  };

  const runGeneration = (overrides: any) =>
    generation.generateAssistantReply({
      ...overrides,
      activeStory,
      activeWorld,
      activeCharacter,
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
    dispatchLore,
    worlds,
    characters,
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
    sidebarCollapsed,
    editorCollapsed,
    topbarCollapsed,
    promptTokens,
    generationStatus,
    progressPercent,
    isExtractingUpdates,
    activeWorld,
    activeStoryCharacters,
    activeCharacter,
    selectedCharacter,
    selectedWorld,
    saveKoboldBaseUrl,
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
    setIsGenerating,
    setPromptTokens,
    setGenerationStatus,
    setProgressPercent,
    setIsExtractingUpdates,
    saveWorldList,
    saveCharacterList,
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
    activeCharacter,
    activeLoreMemory,
    activeStory,
    activeStoryCharacters,
    activeView,
    activeWorld,
    characterImportRef,
    characters,
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
    sidebarCollapsed,
    editorCollapsed,
    topbarCollapsed,
    promptTokens,
    selectedCharacter,
    selectedCharacterSheetId,
    selectedPendingUpdateIds,
    selectedWorld,
    selectedWorldSheetId,
    setActiveView,
    setDebugOpen,
    setSelectedCharacterSheetId,
    setSelectedWorldSheetId,
    saveKoboldBaseUrl,
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
