// Story, world, character, and UI navigation state reducer.
import { World, Character, Story } from "../types/index";

export interface StoryState {
  worlds: World[];
  characters: Character[];
  stories: Story[];
  activeStoryId: string | null;
  activeView: string;
  selectedCharacterSheetId: string;
  selectedWorldSheetId: string;
  storyDraft: Story | null;
  debugOpen: boolean;
}

export const storyInitialState: StoryState = {
  worlds: [],
  characters: [],
  stories: [],
  activeStoryId: null,
  activeView: "landing",
  selectedCharacterSheetId: "",
  selectedWorldSheetId: "",
  storyDraft: null,
  debugOpen: false,
};

export type StoryAction =
  | { type: "SAVE_WORLDS"; payload: World[] }
  | { type: "SAVE_CHARACTERS"; payload: Character[] }
  | { type: "SAVE_STORIES"; payload: Story[] }
  | { type: "SWITCH_STORY"; payload: { storyId: string } }
  | { type: "CLEAR_ACTIVE_STORY" }
  | { type: "SET_ACTIVE_VIEW"; payload: string }
  | { type: "SELECT_CHARACTER_SHEET"; payload: string }
  | { type: "SELECT_WORLD_SHEET"; payload: string }
  | { type: "SET_STORY_DRAFT"; payload: Story | null }
  | { type: "SET_DEBUG_OPEN"; payload: boolean }
  | {
      type: "FACTORY_RESET";
      payload: { worlds: World[]; characters: Character[]; stories: Story[] };
    };

export function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case "SAVE_WORLDS":
      return { ...state, worlds: action.payload };

    case "SAVE_CHARACTERS":
      return { ...state, characters: action.payload };

    case "SAVE_STORIES":
      return { ...state, stories: action.payload };

    case "SWITCH_STORY":
      return {
        ...state,
        activeStoryId: action.payload.storyId,
        activeView: "story",
        storyDraft: null,
      };

    case "CLEAR_ACTIVE_STORY":
      return {
        ...state,
        activeStoryId: null,
        activeView: "landing",
        storyDraft: null,
      };

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
        stories: action.payload.stories,
        selectedWorldSheetId: action.payload.worlds[0]?.id || "",
        selectedCharacterSheetId: action.payload.characters[0]?.id || "",
      };

    default:
      return state;
  }
}
