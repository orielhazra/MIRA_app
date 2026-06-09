// Story CRUD hook — creation, switching, deletion, context/director/memory saves.

import {
  Story,
  World,
  Character,
  DirectorNotes,
  StoryJournal,
  CurrentContext,
  CastState,
  StoryCastMember,
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
import { createEmptyWorldOverlay, getLatestTemplateByKey, resolveEffectiveWorld } from "../services/storyWorld";
import { createId } from "../utils/helpers";
import {
  createInitialCastState,
  createInitialCurrentContext,
  loadChatForStory,
  uniqueCompact,
  syncDirectorNotesFromContext,
  syncCurrentContextFromDirectorNotes,
} from "../utils/appHelpers";
import { createEmptyCharacterOverlay } from "../constants/defaultData";
import { resolveEffectiveStoryCharacters } from "../services/storyCharacters";
import { useToast } from "../context/ToastContext";

interface ActiveStorySaveDeps {
  activeStory: Story | null;
  saveActiveStory: (story: Story) => void;
}

interface SaveSceneDeps extends ActiveStorySaveDeps {
  nextContext: CurrentContext;
  nextDirectorNotes: DirectorNotes;
}

interface SaveMemoryDeps extends ActiveStorySaveDeps {
  nextMemory: StoryJournal;
}

interface SaveCastDeps extends ActiveStorySaveDeps {
  castMembers: StoryCastMember[];
  activeStoryCharacters: Character[];
  nextCastState: CastState;
}

interface SaveNotesDeps extends ActiveStorySaveDeps {
  notes: DirectorNotes;
}

export default function useStoryActions() {
  const { showToast } = useToast();
  function saveCurrentContext({ activeStory, saveActiveStory }: ActiveStorySaveDeps) {
    if (!activeStory || !saveActiveStory) return;
    const normalizedContext = normalizeCurrentContext(activeStory.currentContext);
    const syncedDirectorNotes = syncDirectorNotesFromContext(activeStory.directorNotes, normalizedContext);
    saveActiveStory({ ...activeStory, currentContext: normalizedContext, directorNotes: syncedDirectorNotes });
  }

  function saveSceneControl({ activeStory, saveActiveStory, nextContext, nextDirectorNotes }: SaveSceneDeps) {
    if (!activeStory || !saveActiveStory) return;
    const normalizedContext = normalizeCurrentContext(nextContext);
    const normalizedDirectorNotes = normalizeDirectorNotes(nextDirectorNotes);
    saveActiveStory({ ...activeStory, currentContext: normalizedContext, directorNotes: normalizedDirectorNotes });
  }

  function saveStoryMemory({ activeStory, saveActiveStory, nextMemory }: SaveMemoryDeps) {
    if (!activeStory || !saveActiveStory) return;
    saveActiveStory({ ...activeStory, storyMemory: normalizeStoryMemory(nextMemory) });
  }

  function saveCastState({ activeStory, saveActiveStory, castMembers, activeStoryCharacters, nextCastState }: SaveCastDeps) {
    if (!activeStory || !saveActiveStory) return;
    saveActiveStory({ ...activeStory, castState: normalizeCastState(nextCastState, castMembers, activeStoryCharacters) });
  }

  function saveDirectorNotes({ activeStory, saveActiveStory, notes }: SaveNotesDeps) {
    if (!activeStory || !saveActiveStory) return;
    const normalizedNotes = normalizeDirectorNotes(notes);
    const syncedContext = syncCurrentContextFromDirectorNotes(activeStory.currentContext, normalizedNotes);
    saveActiveStory({ ...activeStory, directorNotes: normalizedNotes, currentContext: syncedContext });
  }

  function clearDirectorNotes(deps: any) {
    saveDirectorNotes({ ...deps, notes: {} as DirectorNotes });
  }

  function openStoryCreationSheet(deps: any) {
    const { isGenerating, worlds = [], characters = [], activeWorld, setStoryDraft, setActiveView } = deps;
    if (isGenerating) return;
    if (worlds.length === 0 || characters.length === 0) {
      showToast("You need at least one world and one character to create a story.");
      return;
    }

    const activeTemplateKey = String(activeWorld?.templateKey || activeWorld?.id || "");
    const templateWorld = getLatestTemplateByKey(activeTemplateKey, worlds)
      || (activeWorld && worlds.find((world: World) => world.id === activeWorld.id))
      || worlds[0]
      || null;
    
    // We'll keep characterIds in the draft for UI convenience, then convert to castMembers on start.
    const draft = {
      title: "Untitled Story",
      templateWorldId: templateWorld?.id || "",
      templateWorldKey: templateWorld?.templateKey || templateWorld?.id || "",
      templateWorldVersion: Number(templateWorld?.templateVersion || 1),
      worldOverlay: createEmptyWorldOverlay(),
      characterIds: [characters[0]?.id || ""],
      scenario: "",
      greeting: "",
      storyLorebook: [],
    };

    setStoryDraft?.(draft);
    setActiveView?.("story-create");
  }

  async function switchStory(deps: any) {
    const {
      storyId,
      isGenerating,
      worlds = [],
      characters = [],
      repository,
      setActiveStory,
      saveActiveStory,
      removeStoryMeta,
      setChatHistory,
      setActiveLoreMemory,
      setSelectedCharacterSheetId,
      setSelectedWorldSheetId,
      setStoryDraft,
      setActiveView,
    } = deps;

    if (isGenerating) {
      showToast("Please wait for the current reply to finish before switching stories.");
      return;
    }

    const loadedStory = await repository?.stories?.loadFull(storyId);
    if (!loadedStory) {
      showToast("Story not found.");
      removeStoryMeta?.(storyId);
      return;
    }

    const story = normalizeStory({ ...loadedStory, lastPlayedAt: Date.now() }, worlds, characters);
    const storyCharacters = resolveEffectiveStoryCharacters(story, characters);
    const fallbackWorld = resolveEffectiveWorld(story, worlds) || worlds.find((item: World) => item.id === story.templateWorldId) || worlds[0] || null;

    let nextChatHistory: any[] = [];
    try {
      nextChatHistory = loadChatForStory(story, worlds, characters);
    } catch (error) {
      console.error("Failed to load chat for selected story. Falling back to opening message.", error);
      nextChatHistory = fallbackWorld
        ? [{ role: "assistant", content: buildOpeningMessage(story, fallbackWorld, storyCharacters) }]
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

    setActiveStory?.(story);
    saveActiveStory?.(story);
    repository?.activeStory.set(story.id);
    setChatHistory?.(nextChatHistory);
    setActiveLoreMemory?.(nextLoreMemory);
    
    // Select the first cast member instance by ID
    const firstMember = story.castMembers[0];
    setSelectedCharacterSheetId?.(firstMember?.id || "");
    
    setSelectedWorldSheetId?.(story.templateWorldId || worlds[0]?.id || "");
    setStoryDraft?.(null);
    setActiveView?.("story");
  }

  function startStoryFromCreationSheet(deps: any) {
    const {
      draft,
      worlds = [],
      characters = [],
      saveActiveStory,
      setActiveStory,
      repository,
      setChatHistory,
      setActiveLoreMemory,
      setSelectedCharacterSheetId,
      setSelectedWorldSheetId,
      setStoryDraft,
      setActiveView,
    } = deps;

    const world = worlds.find((item: World) => item.id === draft.templateWorldId);
    const selectedCharacterIds = uniqueCompact(Array.isArray(draft.characterIds) ? draft.characterIds : []);
    const selectedCharacters = selectedCharacterIds
      .map((id) => characters.find((item: Character) => item.id === id))
      .filter(Boolean);

    if (!world) return { error: "Please choose a valid world." };
    if (selectedCharacters.length === 0) return { error: "Please choose at least one story character." };

    const castMembers: StoryCastMember[] = selectedCharacters.map(char => ({
      id: createId("cast"),
      templateCharacterId: char.id,
      templateCharacterKey: char.templateKey || char.id,
      templateCharacterVersion: char.templateVersion || 1,
      overlay: createEmptyCharacterOverlay()
    }));

    const baseStory = normalizeStory(
      {
        id: createId("story"),
        title: draft.title?.trim() || "Untitled Story",
        templateWorldId: world.id,
        templateWorldKey: String(draft.templateWorldKey || world.templateKey || world.id),
        templateWorldVersion: Number(draft.templateWorldVersion || world.templateVersion || 1),
        worldOverlay: createEmptyWorldOverlay(),
        castMembers,
        scenario: draft.scenario?.trim() || "",
        greeting: draft.greeting?.trim() || "The scene begins.",
        storyLorebook: normalizeStoredLorebook(draft.storyLorebook || []),
        storyMemory: normalizeStoryMemory({}),
        currentContext: createInitialCurrentContext(world, selectedCharacters),
        castState: createInitialCastState(castMembers, characters),
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
      },
      worlds,
      characters
    );

    const effectiveWorld = resolveEffectiveWorld(baseStory, worlds) || world;
    const newStory = normalizeStory({
      ...baseStory,
      currentContext: createInitialCurrentContext(effectiveWorld, selectedCharacters),
    }, worlds, characters);

    setActiveStory?.(newStory);
    saveActiveStory?.(newStory);
    repository?.activeStory.set(newStory.id);

    const opening = [{ role: "assistant", content: buildOpeningMessage(newStory, effectiveWorld, selectedCharacters) }];
    setChatHistory?.(opening);
    repository?.chats.save(newStory.id, opening);
    setActiveLoreMemory?.([]);
    repository?.loreMemory.save(newStory.id, []);
    
    // Select the first cast member instance
    setSelectedCharacterSheetId?.(newStory.castMembers[0]?.id || "");
    
    setSelectedWorldSheetId?.(world.id);
    setStoryDraft?.(null);
    setActiveView?.("story");
    return { ok: true };
  }

  function cancelStoryCreation({ activeStory, setStoryDraft, setActiveView }: any) {
    setStoryDraft?.(null);
    setActiveView?.(activeStory?.id ? "story" : "landing");
  }

  function deleteActiveStory({ activeStory, clearActiveStorySelection, repository, removeStoryMeta }: any) {
    if (!activeStory) {
      showToast("No active story to delete.");
      return;
    }

    repository?.stories?.deleteStory?.(activeStory.id);
    repository?.maintenance?.removeStoryRuntimeData?.(activeStory.id);
    removeStoryMeta?.(activeStory.id);
    clearActiveStorySelection?.();
  }

  function assignWorldToStory(deps: any) {
    const {
      worldId,
      activeStory,
      characters = [],
      getWorld,
      saveActiveStory,
      resetCurrentStoryState,
      setSelectedWorldSheetId,
      setActiveView,
    } = deps;

    if (!activeStory || worldId === activeStory.templateWorldId) return;
    const world = getWorld?.(worldId);
    if (!world) return showToast("World not found.");

    const effectiveCharacters = resolveEffectiveStoryCharacters(activeStory, characters);
    const rebuiltContext = createInitialCurrentContext(world, effectiveCharacters);
    const updatedStory = {
      ...activeStory,
      templateWorldId: world.id,
      templateWorldKey: world.templateKey || world.id,
      templateWorldVersion: Number(world.templateVersion || 1),
      worldOverlay: createEmptyWorldOverlay(),
      currentContext: rebuiltContext,
      directorNotes: syncDirectorNotesFromContext(activeStory.directorNotes, rebuiltContext),
    };

    saveActiveStory?.(updatedStory);
    resetCurrentStoryState?.(activeStory.id, updatedStory, world, effectiveCharacters);
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
