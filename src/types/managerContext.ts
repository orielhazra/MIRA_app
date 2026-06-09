/**
 * Type for the managerContext object passed to binding factory functions.
 * This is the internal context shared between useAppManager and useAppManagerBindings.
 *
 * Derived from the managerContext object in useAppManager.ts.
 */

import type { Dispatch } from "react";
import type { Story, StoryMeta, World, Character, Persona, ChatMessage, LoreEntry } from "./index";
import type { StoryAction } from "../reducers/storyReducer";
import type { PendingUpdate } from "../reducers/loreReducer";
import type { PersistenceStatus } from "../services/storage/persistenceTracker";
import type { RepositoryStorage } from "../services/storage/types";

import type useStoryActions from "../hooks/useStoryActions";
import type useChatActions from "../hooks/useChatActions";
import type useCharacterActions from "../hooks/useCharacterActions";
import type useWorldActions from "../hooks/useWorldActions";
import type useStoryWorldActions from "../hooks/useStoryWorldActions";
import type useLoreActions from "../hooks/useLoreActions";
import type useStateUpdates from "../hooks/useStateUpdates";
import type useImportExport from "../hooks/useImportExport";
import type useStoryCharacterActions from "../hooks/useStoryCharacterActions";
import type useGeneration from "../hooks/useGeneration";

export interface AppManagerContext {
  // Repository
  repository: RepositoryStorage;

  // Reducer dispatchers
  dispatchStory: Dispatch<StoryAction>;
  resetPendingUpdates: () => void;

  // Story state
  worlds: World[];
  characters: Character[];
  personas: Persona[];
  storyMetas: StoryMeta[];
  activeStory: Story | null;
  activeView: string;
  selectedCharacterSheetId: string;
  selectedWorldSheetId: string;
  storyDraft: Story | null;
  debugOpen: boolean;

  // Chat state
  chatHistory: ChatMessage[];
  editingMessageIndex: number | null;

  // Lore state
  activeLoreMemory: LoreEntry[];
  pendingUpdates: PendingUpdate[];
  selectedPendingUpdateIds: string[];
  pendingUpdateStatus: string;

  // Generation state
  isGenerating: boolean;
  persistenceInfo: PersistenceStatus;
  koboldBaseUrl: string;
  storageModeLabel: string;
  storageTargetLabel: string;
  sidebarCollapsed: boolean;
  editorCollapsed: boolean;
  topbarCollapsed: boolean;
  promptTokens: string | number;
  generationStatus: string;
  progressPercent: number;
  isExtractingUpdates: boolean;

  // Derived values
  activeWorld: World | null;
  activeStoryCharacters: Character[];
  selectedCharacter: Character | null;
  selectedWorld: World | null;
  selectedPersona: Persona | null;

  // Settings actions
  saveKoboldBaseUrl: (url: string) => void;
  clearPersistenceError: () => void;
  flushPersistence: () => void;
  toggleSidebarCollapsed: () => void;
  toggleEditorCollapsed: () => void;
  toggleTopbarCollapsed: () => void;

  // State setters
  setStoryDraft: (draft: Story | null) => void;
  setActiveView: (view: string) => void;
  setSelectedCharacterSheetId: (id: string) => void;
  setSelectedWorldSheetId: (id: string) => void;
  setDebugOpen: (open: boolean) => void;
  setActiveStory: (story: Story | null) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  setEditingMessageIndex: (index: number | null) => void;
  setActiveLoreMemory: (memory: LoreEntry[]) => void;
  setPendingUpdates: (updates: PendingUpdate[]) => void;
  setSelectedPendingUpdateIds: (ids: string[]) => void;
  setPendingUpdateStatus: (status: string) => void;
  setIsGenerating: (value: boolean) => void;
  setPromptTokens: (value: string) => void;
  setGenerationStatus: (status: string) => void;
  setProgressPercent: (percent: number) => void;
  setIsExtractingUpdates: (value: boolean) => void;

  // List persistence
  saveWorldList: (worlds: World[]) => void;
  saveCharacterList: (characters: Character[]) => void;
  savePersonaList: (personas: Persona[]) => void;
  saveStoryMetas: (metas: StoryMeta[]) => void;
  upsertStoryMeta: (meta: StoryMeta) => void;
  removeStoryMeta: (storyId: string) => void;

  // Story actions
  saveActiveStory: (story: Story) => void;
  saveChatForActiveStory: (history: ChatMessage[]) => void;
  saveLoreForActiveStory: (memory: LoreEntry[]) => void;

  // Lookups
  getWorld: (id: string) => World | null;
  getCharacter: (id: string) => Character | null;
  getStoryCharacters: (story: Story) => Character[];

  // Complex actions
  clearActiveStorySelection: () => void;
  deleteStoryById: (storyId: string) => void;
  openStoryEditSheet: (storyId: string) => Promise<void>;
  saveStoryEdits: (draft: Story) => { ok?: boolean; error?: string };
  cancelStoryEdit: () => void;
  resetCurrentStoryState: (storyId?: string, story?: Story | null, world?: World | null, characters?: Character[]) => void;
  createBlankPersona: () => void;
  savePersonaEdits: (draft: Persona) => void;
  deletePersona: (id: string) => void;
  isLoadingStory: boolean;
  setIsLoadingStory: (loading: boolean) => void;
  setPendingConfirm: (confirm: {
    open: boolean;
    title: string;
    message: string;
    variant: "danger" | "default";
    confirmLabel: string;
    action: () => void;
  } | null) => void;
}

// Hook return types for binding factory second arguments
export type StoryActionsType = ReturnType<typeof useStoryActions>;
export type ChatActionsType = ReturnType<typeof useChatActions>;
export type CharacterActionsType = ReturnType<typeof useCharacterActions>;
export type WorldActionsType = ReturnType<typeof useWorldActions>;
export type StoryWorldActionsType = ReturnType<typeof useStoryWorldActions>;
export type LoreActionsType = ReturnType<typeof useLoreActions>;
export type StateUpdatesType = ReturnType<typeof useStateUpdates>;
export type ImportExportType = ReturnType<typeof useImportExport>;
export type StoryCharacterActionsType = ReturnType<typeof useStoryCharacterActions>;
export type GenerationType = ReturnType<typeof useGeneration>;
