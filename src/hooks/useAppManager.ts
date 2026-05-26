import { useMemo, useRef, useReducer } from "react";
import { defaultCharacters, defaultStories, defaultWorlds } from "../constants/defaultData";
import { normalizeCastState, normalizeCharacter, normalizeStory, normalizeWorld } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { repository } from "../services/repository";
import { cloneJson } from "../utils/helpers";
import { isAssistantMessageWithOptions } from "../features/chat/ChatView";
import {
  chooseActiveCastLead,
  loadInitialState,
  getStoryCharactersFromLists,
  uniqueCompact,
  loadChatForStory,
} from "../utils/appHelpers";

import { storyReducer, storyInitialState, StoryAction } from "../reducers/storyReducer";
import { chatReducer, chatInitialState, ChatAction } from "../reducers/chatReducer";
import { loreReducer, loreInitialState, LoreAction } from "../reducers/loreReducer";
import { generationReducer, generationInitialState, GenerationAction } from "../reducers/generationReducer";

import useGeneration from "./useGeneration";
import useChatActions from "./useChatActions";
import useStoryActions from "./useStoryActions";
import useCharacterActions from "./useCharacterActions";
import useWorldActions from "./useWorldActions";
import useLoreActions from "./useLoreActions";
import useStateUpdates from "./useStateUpdates";
import useImportExport from "./useImportExport";

export default function useAppManager() {
  const initial = useMemo(loadInitialState, []);

  const [storyState, dispatchStory] = useReducer(storyReducer, {
    ...storyInitialState,
    worlds: initial.worlds,
    characters: initial.characters,
    stories: initial.stories,
    activeStoryId: initial.activeStoryId,
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
    pendingUpdateStatus: "idle",
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
    stories,
    activeStoryId,
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeStory = useMemo(() => stories.find(s => s.id === activeStoryId) || null, [stories, activeStoryId]);
  const activeWorld = useMemo(() => activeStory ? worlds.find(w => w.id === activeStory.worldId) || worlds[0] || null : worlds[0] || null, [worlds, activeStory]);
  const activeStoryCharacters = useMemo(() => activeStory ? getStoryCharactersFromLists(activeStory, characters) : (characters[0] ? [characters[0]] : []), [activeStory, characters]);
  const activeCharacter = useMemo(() => chooseActiveCastLead(activeStory, activeStoryCharacters) || characters[0] || null, [activeStory, activeStoryCharacters, characters]);
  
  const selectedCharacter = useMemo(() => characters.find(c => c.id === selectedCharacterSheetId) || characters[0] || null, [characters, selectedCharacterSheetId]);
  const selectedWorld = useMemo(() => worlds.find(w => w.id === selectedWorldSheetId) || worlds[0] || null, [worlds, selectedWorldSheetId]);
  
  const loreStatusText = activeLoreMemory.length ? `Lore: ${activeLoreMemory.map(e => `${e.source}: ${e.name}`).join(", ")}` : "Lore: none";

  const setStoryDraft = (draft: any) => dispatchStory({ type: 'SET_STORY_DRAFT', payload: draft });
  const setActiveView = (view: string) => dispatchStory({ type: 'SET_ACTIVE_VIEW', payload: view });
  const setSelectedCharacterSheetId = (id: string) => dispatchStory({ type: 'SELECT_CHARACTER_SHEET', payload: id });
  const setSelectedWorldSheetId = (id: string) => dispatchStory({ type: 'SELECT_WORLD_SHEET', payload: id });
  const setDebugOpen = (open: boolean) => dispatchStory({ type: 'SET_DEBUG_OPEN', payload: open });

  // Stubs for functions required by MainLayout that aren't fully hooked up
  const getWorld = (id: string) => worlds.find(w => w.id === id) || null;
  const getCharacter = (id: string) => characters.find(c => c.id === id) || null;
  
  const addCharacterToActiveStory = () => {};
  const applySelectedPendingUpdates = () => {};
  const assignWorldToStory = () => {};
  const cancelGeneration = () => {};
  const cancelMessageEdit = () => {};
  const cancelStoryCreation = () => {};
  const clearDirectorNotes = () => {};
  const clearTemporaryLore = () => {};
  const continueLastReply = () => {};
  const createBlankCharacter = () => {};
  const createBlankWorld = () => {};
  const deleteActiveStory = () => {};
  const deleteMessagesFromIndex = () => {};
  const deleteSelectedCharacter = () => {};
  const deleteSelectedWorld = () => {};
  const elaborateLastReply = () => {};
  const exportActiveStory = () => {};
  const exportCharacter = () => {};
  const exportWorld = () => {};
  const extractStateUpdates = () => {};
  const factoryReset = () => {};
  const handleImportCharacterFile = () => {};
  const handleImportStoryFile = () => {};
  const handleImportWorldFile = () => {};
  const openStoryCreationSheet = () => { setActiveView('story-create'); };
  const refreshActiveLore = () => {};
  const regenerateFromMessage = () => {};
  const rejectPendingUpdates = () => {};
  const removeCharacterFromActiveStory = () => {};
  const rerollLastReply = () => {};
  const resetChat = () => {};
  const retryLastGeneration = () => {};
  const rollbackLastExchange = () => {};
  const saveCastState = () => {};
  const saveCharacterSheetEdits = () => {};
  const saveCurrentContext = () => {};
  const saveDirectorNotes = () => {};
  const saveMessageEdit = () => {};
  const saveSceneControl = () => {};
  const saveStoryCastIdentity = () => {};
  const saveStoryMemory = () => {};
  const saveTemporaryLore = () => {};
  const saveWorldSheetEdits = () => {};
  const selectAssistantOption = () => {};
  const sendMessage = () => {};
  const setCharacterPresenceInActiveStory = () => {};
  const startEditingMessage = () => {};
  const startStoryFromCreationSheet = () => {};
  const switchStory = (id: string) => { dispatchStory({ type: 'SWITCH_STORY', payload: { storyId: id } }); setActiveView('story'); };
  const togglePendingUpdate = () => {};
  const updateCharacterLore = () => {};
  const updateStoryLore = () => {};
  const updateWorldLore = () => {};

  return {
    abortControllerRef,
    activeCharacter,
    activeLoreMemory,
    activeStory,
    activeStoryCharacters,
    activeStoryId,
    activeView,
    activeWorld,
    addCharacterToActiveStory,
    applySelectedPendingUpdates,
    assignWorldToStory,
    cancelGeneration,
    cancelMessageEdit,
    cancelStoryCreation,
    characterImportRef,
    characters,
    chatHistory,
    clearDirectorNotes,
    clearTemporaryLore,
    continueLastReply,
    createBlankCharacter,
    createBlankWorld,
    debugOpen,
    deleteActiveStory,
    deleteMessagesFromIndex,
    deleteSelectedCharacter,
    deleteSelectedWorld,
    editingMessageIndex,
    elaborateLastReply,
    exportActiveStory,
    exportCharacter,
    exportWorld,
    extractStateUpdates,
    factoryReset,
    generationStatus,
    getCharacter,
    getWorld,
    handleImportCharacterFile,
    handleImportStoryFile,
    handleImportWorldFile,
    isExtractingUpdates,
    isGenerating,
    loreStatusText,
    openStoryCreationSheet,
    pendingUpdateStatus,
    pendingUpdates,
    progressPercent,
    promptTokens,
    refreshActiveLore,
    regenerateFromMessage,
    rejectPendingUpdates,
    removeCharacterFromActiveStory,
    rerollLastReply,
    resetChat,
    retryLastGeneration,
    rollbackLastExchange,
    saveCastState,
    saveCharacterSheetEdits,
    saveCurrentContext,
    saveDirectorNotes,
    saveMessageEdit,
    saveSceneControl,
    saveStoryCastIdentity,
    saveStoryMemory,
    saveTemporaryLore,
    saveWorldSheetEdits,
    selectAssistantOption,
    selectedCharacter,
    selectedCharacterSheetId,
    selectedPendingUpdateIds,
    selectedWorld,
    selectedWorldSheetId,
    sendMessage,
    setActiveView,
    setCharacterPresenceInActiveStory,
    setDebugOpen,
    setSelectedCharacterSheetId,
    setSelectedWorldSheetId,
    setStoryDraft,
    startEditingMessage,
    startStoryFromCreationSheet,
    stories,
    storyDraft,
    storyImportRef,
    switchStory,
    togglePendingUpdate,
    updateCharacterLore,
    updateStoryLore,
    updateWorldLore,
    worldImportRef,
    worlds
  };
}
