import { useEffect, useMemo, useRef, useReducer, useState } from "react";
import { ChatMessage } from "../types";
import { DEFAULT_KOBOLD_BASE_URL, CUSTOM_DB_PATH } from "../constants/defaultData";
import { normalizeCharacter, normalizeStory, normalizeWorld } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { repository, isTauri } from "../services/repository";
import {
  chooseActiveCastLead,
  loadInitialState,
  getStoryCharactersFromLists,
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
import useLoreActions from "./useLoreActions";
import useStateUpdates from "./useStateUpdates";
import useImportExport from "./useImportExport";
import {
  createStoryBindings,
  createChatBindings,
  createStateUpdateBindings,
  createCharacterBindings,
  createWorldBindings,
  createLoreBindings,
  createImportExportBindings,
  createMaintenanceBindings,
} from "./useAppManagerBindings";

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
    () => (activeStory ? worlds.find((world) => world.id === activeStory.worldId) || worlds[0] || null : worlds[0] || null),
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
  const loreActions = useLoreActions();
  const stateUpdates = useStateUpdates();
  const importExport = useImportExport();

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

  const saveCharacterList = (nextCharacters: any[], sourceWorlds: any[] = worlds) => {
    const normalizedCharacters = nextCharacters.map((character) => normalizeCharacter(character, sourceWorlds));
    dispatchStory({ type: "SAVE_CHARACTERS", payload: normalizedCharacters });
    repository.characters.saveAll(normalizedCharacters);
  };

  // Updated: Now saves metas only (we'll evolve this further)
  const saveStoryMetas = (nextMetas: any[]) => {
    dispatchStory({ type: "SET_STORY_METAS", payload: nextMetas });
    // repository.stories.saveAll will be replaced later
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
    setActiveStory(null);
    setChatHistory([]);
    setActiveLoreMemory([]);
    setStoryDraft(null);
    setActiveView("landing");
    dispatchLore({ type: "RESET_PENDING_UPDATES" });
    repository.activeStory.clear();
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
    saveChatForActiveStory,
    saveLoreForActiveStory,
    getWorld,
    getCharacter,
    getStoryCharacters,
    clearActiveStorySelection,
    resetCurrentStoryState,
  };

  const storyBindings = createStoryBindings(managerContext, storyActions);
  const chatBindings = createChatBindings(managerContext, chatActions, generation);
  const stateUpdateBindings = createStateUpdateBindings(managerContext, stateUpdates);
  const characterBindings = createCharacterBindings(managerContext, characterActions);
  const worldBindings = createWorldBindings(managerContext, worldActions);
  const loreBindings = createLoreBindings(managerContext, loreActions);
  const importExportBindings = createImportExportBindings(managerContext, importExport);
  const maintenanceBindings = createMaintenanceBindings(managerContext);

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
    ...loreBindings,
    ...importExportBindings,
    ...maintenanceBindings,
  };
}