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
  activeStory: Story | null;
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

  function openStoryCreationSheet(deps: any) {
    const { isGenerating, worlds = [], characters = [], activeWorld, activeCharacter, setStoryDraft, setActiveView } = deps;
    if (isGenerating) return;
    if (worlds.length === 0 || characters.length === 0) {
      alert("You need at least one world and one character to create a story.");
      return;
    }

    const draft = {
      title: "Untitled Story",
      worldId: activeWorld?.id || worlds[0]?.id || "",
      characterIds: uniqueCompact([activeCharacter?.id || characters[0]?.id || ""]),
      scenario: "",
      greeting: "",
      storyLorebook: [],
    };

    setStoryDraft?.(draft);
    setActiveView?.("story-create");
  }

  function switchStory(deps: any) {
    const {
      storyId,
      isGenerating,
      stories = [],
      worlds = [],
      characters = [],
      setActiveStoryId,
      setChatHistory,
      setActiveLoreMemory,
      repository,
      setSelectedCharacterSheetId,
      setSelectedWorldSheetId,
      setStoryDraft,
      setActiveView,
    } = deps;

    if (isGenerating) {
      alert("Please wait for the current reply to finish before switching stories.");
      return;
    }

    const story = stories.find((item: Story) => item.id === storyId);
    if (!story) {
      alert("Story not found.");
      return;
    }

    const storyCharacters = getStoryCharactersFromLists(story, characters);
    const leadCharacter = chooseActiveCastLead(story, storyCharacters) || characters[0] || null;
    const fallbackWorld = worlds.find((item: World) => item.id === story.worldId) || worlds[0] || null;

    let nextChatHistory: any[] = [];
    try {
      nextChatHistory = loadChatForStory(story, worlds, characters);
    } catch (error) {
      console.error("Failed to load chat for selected story. Falling back to opening message.", error);
      nextChatHistory = fallbackWorld && leadCharacter
        ? [{ role: "assistant", content: buildOpeningMessage(story, leadCharacter, fallbackWorld, storyCharacters) }]
        : [];
    }

    let nextLoreMemory: any[] = [];
    try {
      const loadedLoreMemory = repository?.loreMemory.load(story.id, []);
      nextLoreMemory = Array.isArray(loadedLoreMemory) ? loadedLoreMemory : [];
    } catch (error) {
      console.error("Failed to load lore memory for selected story. Falling back to empty lore memory.", error);
      nextLoreMemory = [];
    }

    setActiveStoryId?.(story.id);
    repository?.activeStory.set(story.id);
    setChatHistory?.(nextChatHistory);
    setActiveLoreMemory?.(nextLoreMemory);
    setSelectedCharacterSheetId?.(leadCharacter?.id || characters[0]?.id || "");
    setSelectedWorldSheetId?.(story.worldId || worlds[0]?.id || "");
    setStoryDraft?.(null);
    setActiveView?.("story");
  }

  function startStoryFromCreationSheet(deps: any) {
    const {
      draft,
      worlds = [],
      characters = [],
      stories = [],
      saveStoryList,
      setActiveStoryId,
      repository,
      setChatHistory,
      setActiveLoreMemory,
      setSelectedCharacterSheetId,
      setSelectedWorldSheetId,
      setStoryDraft,
      setActiveView,
    } = deps;

    const world = worlds.find((item: World) => item.id === draft.worldId);
    const selectedCharacterIds = uniqueCompact(Array.isArray(draft.characterIds) ? draft.characterIds : []);
    const selectedCharacters = selectedCharacterIds
      .map((id) => characters.find((item: Character) => item.id === id))
      .filter(Boolean);
    const leadCharacter = selectedCharacters[0] || null;

    if (!world) return { error: "Please choose a valid world." };
    if (selectedCharacters.length === 0) return { error: "Please choose at least one story character." };

    const newStory = normalizeStory(
      {
        id: createId("story"),
        title: draft.title?.trim() || "Untitled Story",
        worldId: world.id,
        characterIds: selectedCharacters.map((item: Character) => item.id),
        mainCharacterId: leadCharacter?.id || "",
        scenario: draft.scenario?.trim() || "",
        greeting: draft.greeting?.trim() || "The scene begins.",
        storyLorebook: normalizeStoredLorebook(draft.storyLorebook || []),
        storyMemory: normalizeStoryMemory({}),
        currentContext: createInitialCurrentContext(world, selectedCharacters),
        castState: createInitialCastState(selectedCharacters),
        createdAt: Date.now(),
      },
      worlds,
      characters
    );

    const nextStories = [...stories, newStory];
    saveStoryList(nextStories);
    setActiveStoryId?.(newStory.id);
    repository?.activeStory.set(newStory.id);

    const opening = [{ role: "assistant", content: buildOpeningMessage(newStory, leadCharacter, world, selectedCharacters) }];
    setChatHistory?.(opening);
    repository?.chats.save(newStory.id, opening);
    setActiveLoreMemory?.([]);
    repository?.loreMemory.save(newStory.id, []);
    setSelectedCharacterSheetId?.(leadCharacter?.id || "");
    setSelectedWorldSheetId?.(world.id);
    setStoryDraft?.(null);
    setActiveView?.("story");
    return { ok: true };
  }

  function cancelStoryCreation({ activeStory, setStoryDraft, setActiveView }: any) {
    setStoryDraft?.(null);
    setActiveView?.(activeStory?.id ? "story" : "landing");
  }

  function deleteActiveStory({ activeStory, stories = [], saveStoryList, clearActiveStorySelection, repository }: any) {
    if (!activeStory) {
      alert("No active story to delete.");
      return;
    }
    if (!confirm(`Delete story "${activeStory.title}"? This will delete its chat and lore memory.`)) return;

    repository?.maintenance.removeStoryRuntimeData(activeStory.id);
    const nextStories = stories.filter((story: Story) => story.id !== activeStory.id);
    saveStoryList(nextStories);
    clearActiveStorySelection?.();
  }

  function assignWorldToStory(deps: any) {
    const {
      worldId,
      activeStory,
      stories = [],
      characters = [],
      getWorld,
      saveStoryList,
      resetCurrentStoryState,
      setSelectedWorldSheetId,
      setActiveView,
    } = deps;

    if (!activeStory || worldId === activeStory.worldId) return;
    const world = getWorld?.(worldId);
    if (!world) return alert("World not found.");
    if (!confirm("Use this world in the active story? This will reset the story chat and rebuild Current Context for the new world.")) return;

    const storyCharacters = getStoryCharactersFromLists(activeStory, characters);
    const rebuiltContext = createInitialCurrentContext(world, storyCharacters);
    const updatedStory = {
      ...activeStory,
      worldId: world.id,
      currentContext: rebuiltContext,
      directorNotes: syncDirectorNotesFromContext(activeStory.directorNotes, rebuiltContext),
    };
    const nextStories = stories.map((story: Story) => (story.id === activeStory.id ? updatedStory : story));

    saveStoryList(nextStories);
    resetCurrentStoryState?.(activeStory.id, updatedStory, world, storyCharacters);
    setSelectedWorldSheetId?.(world.id);
    setActiveView?.("story");
  }

  return {
    saveCurrentContext,
    saveSceneControl,
    saveStoryMemory,
    saveCastState,
    saveDirectorNotes,
    clearDirectorNotes,
    openStoryCreationSheet,
    switchStory,
    startStoryFromCreationSheet,
    cancelStoryCreation,
    deleteActiveStory,
    assignWorldToStory,
  };
}
