/**
 * StoryStateContext — manages the story reducer (worlds, characters, personas,
 * storyMetas, activeStory, activeView, selections, storyDraft).
 *
 * Extracted from useAppManager as part of the context split (Task 5.1).
 * Owns the storyReducer and all dispatch-based setters.
 *
 * Complex business logic (saveActiveStory, deleteStoryById, openStoryEditSheet, etc.)
 * remains in useAppManager because it depends on cross-context state (chat, lore, UI).
 */

import { createContext, useContext, useMemo, useReducer } from "react";
import type { World, Character, Persona, Story, StoryMeta } from "../types";
import { storyReducer, storyInitialState, type StoryAction } from "../reducers/storyReducer";
import { normalizeWorld, normalizeCharacter, normalizePersona, normalizeStory } from "../services/normalizers";
import { resolveEffectiveWorld } from "../services/storyWorld";
import { getStoryCharactersFromLists } from "../utils/appHelpers";
import { repository } from "../services/repository";
import { storyToMeta } from "../services/storyMeta";
import type { Dispatch } from "react";

interface StoryStateContextValue {
  // Raw state from reducer
  worlds: World[];
  characters: Character[];
  personas: Persona[];
  storyMetas: StoryMeta[];
  activeStory: Story | null;
  activeView: string;
  selectedCharacterSheetId: string;
  selectedWorldSheetId: string;
  storyDraft: Story | null;

  // Derived values
  activeWorld: World | null;
  activeStoryCharacters: Character[];
  selectedCharacter: Character | null;
  selectedWorld: World | null;
  selectedPersona: Persona | null;

  // Setters (dispatch wrappers)
  setActiveView: (view: string) => void;
  setSelectedCharacterSheetId: (id: string) => void;
  setSelectedWorldSheetId: (id: string) => void;
  setStoryDraft: (draft: Story | null) => void;
  setActiveStory: (story: Story | null) => void;

  // List persistence
  saveWorldList: (worlds: World[]) => void;
  saveCharacterList: (characters: Character[]) => void;
  savePersonaList: (personas: Persona[]) => void;
  saveStoryMetas: (metas: StoryMeta[]) => void;
  upsertStoryMeta: (meta: StoryMeta) => void;
  removeStoryMeta: (storyId: string) => void;

  // Lookups
  getWorld: (id: string) => World | null;
  getCharacter: (id: string) => Character | null;
  getStoryCharacters: (story: Story) => Character[];

  // Save with normalization + persistence
  saveActiveStory: (story: Story) => void;

  // Raw dispatcher (needed by factory reset binding)
  dispatchStory: Dispatch<StoryAction>;
}

const StoryStateContext = createContext<StoryStateContextValue | null>(null);

interface StoryStateProviderProps {
  initialState: {
    worlds: World[];
    characters: Character[];
    personas: Persona[];
    storyMetas: StoryMeta[];
    activeStory: Story | null;
    activeView: string;
    selectedCharacterSheetId: string;
    selectedWorldSheetId: string;
  };
  children?: React.ReactNode;
}

export function StoryStateProvider({ initialState, children }: StoryStateProviderProps) {
  const [storyState, dispatchStory] = useReducer(storyReducer, {
    ...storyInitialState,
    worlds: initialState.worlds,
    characters: initialState.characters,
    personas: initialState.personas,
    storyMetas: initialState.storyMetas || [],
    activeStory: initialState.activeStory || null,
    activeView: initialState.activeView,
    selectedCharacterSheetId: initialState.selectedCharacterSheetId,
    selectedWorldSheetId: initialState.selectedWorldSheetId,
    storyDraft: null,
    debugOpen: false,
  });

  const { worlds, characters, personas, storyMetas, activeStory, activeView,
    selectedCharacterSheetId, selectedWorldSheetId, storyDraft } = storyState;

  // Derived values
  const activeWorld = useMemo(
    () => (activeStory ? resolveEffectiveWorld(activeStory, worlds) || worlds[0] || null : worlds[0] || null),
    [worlds, activeStory]
  );

  const activeStoryCharacters = useMemo(
    () => (activeStory ? getStoryCharactersFromLists(activeStory, characters) : characters[0] ? [characters[0]] : []),
    [activeStory, characters]
  );

  const selectedCharacter = useMemo(() => {
    if (!selectedCharacterSheetId) return characters[0] || null;
    let found = characters.find((c) => c.id === selectedCharacterSheetId);
    if (found) return found;
    if (activeStory) {
      const member = activeStory.castMembers.find((m) => m.id === selectedCharacterSheetId);
      if (member) {
        found = characters.find((c) => c.id === member.templateCharacterId);
        if (found) return found;
      }
    }
    const effectiveFound = activeStoryCharacters.find(c => c.id === selectedCharacterSheetId);
    if (effectiveFound) {
      const member = activeStory?.castMembers.find(m => m.id === selectedCharacterSheetId);
      if (member) return characters.find(c => c.id === member.templateCharacterId) || effectiveFound;
      return effectiveFound;
    }
    if (!activeStory) return characters[0] || null;
    return found || effectiveFound || characters[0] || null;
  }, [characters, selectedCharacterSheetId, activeStory, activeStoryCharacters]);

  const selectedWorld = useMemo(
    () => worlds.find((world) => world.id === selectedWorldSheetId) || worlds[0] || null,
    [worlds, selectedWorldSheetId]
  );

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === selectedCharacterSheetId) || personas[0] || null,
    [personas, selectedCharacterSheetId]
  );

  // Setters
  const setActiveView = (view: string) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view });
  const setSelectedCharacterSheetId = (id: string) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id });
  const setSelectedWorldSheetId = (id: string) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id });
  const setStoryDraft = (draft: Story | null) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft });
  const setActiveStory = (story: Story | null) => dispatchStory({ type: "SET_ACTIVE_STORY", payload: story });

  // List persistence
  const saveWorldList = (nextWorlds: World[]) => {
    const normalized = nextWorlds.map(normalizeWorld);
    dispatchStory({ type: "SAVE_WORLDS", payload: normalized });
    repository.worlds.saveAll(normalized);
  };
  const saveCharacterList = (nextCharacters: Character[]) => {
    const normalized = nextCharacters.map(normalizeCharacter);
    dispatchStory({ type: "SAVE_CHARACTERS", payload: normalized });
    repository.characters.saveAll(normalized);
  };
  const savePersonaList = (nextPersonas: Persona[]) => {
    const normalized = nextPersonas.map(normalizePersona);
    dispatchStory({ type: "SAVE_PERSONAS", payload: normalized });
    repository.personas.saveAll(normalized);
  };
  const saveStoryMetas = (nextMetas: StoryMeta[]) => dispatchStory({ type: "SET_STORY_METAS", payload: nextMetas });
  const upsertStoryMeta = (meta: StoryMeta) => dispatchStory({ type: "UPSERT_STORY_META", payload: meta });
  const removeStoryMeta = (storyId: string) => dispatchStory({ type: "REMOVE_STORY_META", payload: storyId });

  // Lookups
  const getWorld = (id: string) => worlds.find((world) => world.id === id) || null;
  const getCharacter = (id: string) => characters.find((character) => character.id === id) || null;
  const getStoryCharacters = (story: Story) => getStoryCharactersFromLists(story, characters);

  // Save with normalization
  const saveActiveStory = (nextStory: Story) => {
    if (!nextStory) return;
    const normalizedStory = normalizeStory(nextStory, worlds, characters);
    dispatchStory({ type: "SET_ACTIVE_STORY", payload: normalizedStory });
    dispatchStory({ type: "UPSERT_STORY_META", payload: storyToMeta(normalizedStory) });
    repository.stories.saveStory(normalizedStory);
  };

  return (
    <StoryStateContext.Provider value={{
      worlds, characters, personas, storyMetas, activeStory, activeView,
      selectedCharacterSheetId, selectedWorldSheetId, storyDraft,
      activeWorld, activeStoryCharacters, selectedCharacter, selectedWorld, selectedPersona,
      setActiveView, setSelectedCharacterSheetId, setSelectedWorldSheetId, setStoryDraft, setActiveStory,
      saveWorldList, saveCharacterList, savePersonaList, saveStoryMetas, upsertStoryMeta, removeStoryMeta,
      getWorld, getCharacter, getStoryCharacters, saveActiveStory, dispatchStory,
    }}>
      {children}
    </StoryStateContext.Provider>
  );
}

export function useStoryState(): StoryStateContextValue {
  const context = useContext(StoryStateContext);
  if (!context) throw new Error("useStoryState must be used within a StoryStateProvider");
  return context;
}
