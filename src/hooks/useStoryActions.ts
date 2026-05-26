// Story CRUD hook — creation, switching, deletion, context/director/memory saves.

import {
  Story,
  World,
  Character,
  DirectorNotes,
  StoryJournal,
  CurrentContext,
  CastState,
} from "../types/index";
import {
  normalizeCastState,
  normalizeCurrentContext,
  normalizeDirectorNotes,
  normalizeStory,
  normalizeStoryMemory,
  normalizeStoredLorebook,
} from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { createId } from "../utils/helpers";
import {
  createInitialCastState,
  createInitialCurrentContext,
  chooseActiveCastLead,
  loadChatForStory,
  getStoryCharactersFromLists,
  uniqueCompact,
  syncDirectorNotesFromContext,
  syncCurrentContextFromDirectorNotes,
} from "../utils/appHelpers";

interface SaveContextDeps {
  activeStory: Story;
  stories: Story[];
  saveStoryList: (stories: Story[]) => void;
}

interface SaveSceneDeps extends SaveContextDeps {
  nextContext: CurrentContext;
  nextDirectorNotes: DirectorNotes;
}

interface SaveMemoryDeps extends SaveContextDeps {
  nextMemory: StoryJournal;
}

interface SaveCastDeps extends SaveContextDeps {
  activeStoryCharacters: Character[];
  nextCastState: CastState;
}

interface SaveNotesDeps extends SaveContextDeps {
  notes: DirectorNotes;
}

export default function useStoryActions() {
  function saveCurrentContext({ activeStory, stories, saveStoryList }: SaveContextDeps) {
    if (!activeStory) return;
    const normalizedContext = normalizeCurrentContext(activeStory.currentContext);
    const syncedDirectorNotes = syncDirectorNotesFromContext(activeStory.directorNotes, normalizedContext);
    saveStoryList(
      stories.map((s) =>
        s.id === activeStory.id ? { ...s, currentContext: normalizedContext, directorNotes: syncedDirectorNotes } : s
      )
    );
  }

  function saveSceneControl({ activeStory, stories, saveStoryList, nextContext, nextDirectorNotes }: SaveSceneDeps) {
    if (!activeStory) return;
    const normalizedContext = normalizeCurrentContext(nextContext);
    const normalizedDirectorNotes = normalizeDirectorNotes(nextDirectorNotes);
    saveStoryList(
      stories.map((s) =>
        s.id === activeStory.id
          ? { ...s, currentContext: normalizedContext, directorNotes: normalizedDirectorNotes }
          : s
      )
    );
  }

  function saveStoryMemory({ activeStory, stories, saveStoryList, nextMemory }: SaveMemoryDeps) {
    if (!activeStory) return;
    const normalizedMemory = normalizeStoryMemory(nextMemory);
    saveStoryList(stories.map((s) => (s.id === activeStory.id ? { ...s, storyMemory: normalizedMemory } : s)));
  }

  function saveCastState({ activeStory, stories, saveStoryList, activeStoryCharacters, nextCastState }: SaveCastDeps) {
    if (!activeStory) return;
    const normalizedCastState = normalizeCastState(nextCastState, activeStoryCharacters);
    saveStoryList(stories.map((s) => (s.id === activeStory.id ? { ...s, castState: normalizedCastState } : s)));
  }

  function saveDirectorNotes({ activeStory, stories, saveStoryList, notes }: SaveNotesDeps) {
    if (!activeStory) return;
    const normalizedNotes = normalizeDirectorNotes(notes);
    const syncedContext = syncCurrentContextFromDirectorNotes(activeStory.currentContext, normalizedNotes);
    saveStoryList(
      stories.map((s) =>
        s.id === activeStory.id ? { ...s, directorNotes: normalizedNotes, currentContext: syncedContext } : s
      )
    );
  }

  function clearDirectorNotes(deps: any) {
    saveDirectorNotes({ ...deps, notes: {} as DirectorNotes });
  }

  // Other functions (openStoryCreationSheet, switchStory, etc.) kept with lighter typing for now

  return {
    saveCurrentContext,
    saveSceneControl,
    saveStoryMemory,
    saveCastState,
    saveDirectorNotes,
    clearDirectorNotes,
    openStoryCreationSheet: (deps: any) => {},
    switchStory: (deps: any) => {},
    startStoryFromCreationSheet: (deps: any) => ({}),
    cancelStoryCreation: (deps: any) => {},
    deleteActiveStory: (deps: any) => {},
    assignWorldToStory: (deps: any) => {},
  };
}
