// Story, world, character, and UI navigation state reducer.
import { World, Character, Story, StoryMeta } from "../types/index";

export interface StoryState {
  worlds: World[];
  characters: Character[];
  storyMetas: StoryMeta[];      // Lightweight list (Phase 2)
  activeStory: Story | null;    // Only one full story loaded at a time
  activeView: string;
  selectedCharacterSheetId: string;
  selectedWorldSheetId: string;
  storyDraft: any | null;
  debugOpen: boolean;
}

export const storyInitialState: StoryState = {
  worlds: [],
  characters: [],
  storyMetas: [],
  activeStory: null,
  activeView: "landing",
  selectedCharacterSheetId: "",
  selectedWorldSheetId: "",
  storyDraft: null,
  debugOpen: false,
};

export type StoryAction =
  | { type: "SAVE_WORLDS"; payload: World[] }
  | { type: "SAVE_CHARACTERS"; payload: Character[] }
  | { type: "SET_STORY_METAS"; payload: StoryMeta[] }
  | { type: "SET_ACTIVE_STORY"; payload: Story | null }
  | { type: "SET_ACTIVE_VIEW"; payload: string }
  | { type: "SELECT_CHARACTER_SHEET"; payload: string }
  | { type: "SELECT_WORLD_SHEET"; payload: string }
  | { type: "SET_STORY_DRAFT"; payload: any | null }
  | { type: "SET_DEBUG_OPEN"; payload: boolean }
  | {
      type: "FACTORY_RESET";
      payload: { worlds: World[]; characters: Character[]; storyMetas: StoryMeta[] };
    };

export function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case "SAVE_WORLDS":
      return { ...state, worlds: action.payload };

    case "SAVE_CHARACTERS":
      return { ...state, characters: action.payload };

    case "SET_STORY_METAS":
      return { ...state, storyMetas: action.payload };

    case "SET_ACTIVE_STORY":
      return { ...state, activeStory: action.payload };

    case "SET_ACTIVE_VIEW":
      return { ...state, activeView: action.payload };

    case "SELECT_CHARACTER_SHEET":
      return { ...state, selectedCharacterSheetId: action.payload };

    case "SELECT_WORLD_SHEET":
      return { ...state, selectedWorldSheetId: action.payload };

    case "SET_STORY_DRAFT":
      return { ...state, storyDraft: action.payload };

    case "SET_DEBUG_OPEN":
      return { ...state, debugOpen: action.payload };

    case "FACTORY_RESET":
      return {
        ...storyInitialState,
        worlds: action.payload.worlds,
        characters: action.payload.characters,
        storyMetas: action.payload.storyMetas,
        selectedWorldSheetId: action.payload.worlds[0]?.id || "",
        selectedCharacterSheetId: action.payload.characters[0]?.id || "",
      };

    default:
      return state;
  }
}