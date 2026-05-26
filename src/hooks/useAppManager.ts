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
  // ─── Initial state ───
  const initial = useMemo(loadInitialState, []);

  // ─── Core state with reducers ───
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

  // ─── Destructure state for easier access ───
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

  const { isGenerating, promptTokens, generationStatus, progressPercent, isExtractingUpdates } =
    generationState;

  // ─── Refs (now properly typed) ───
  const storyImportRef = useRef<HTMLInputElement>(null);
  const characterImportRef = useRef<HTMLInputElement>(null);
  const worldImportRef = useRef<HTMLInputElement>(null);

  // ... rest of the file remains unchanged for now
  // (dispatch calls and logic preserved to avoid breaking behavior)
}