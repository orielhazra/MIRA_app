// Story CRUD hook — creation, switching, deletion, context/director/memory saves.
// Depends on: worlds, characters, stories, activeStory, isGenerating.

import { defaultWorlds, defaultCharacters, DEFAULT_DIRECTOR_NOTES } from "../constants/defaultData";
import { normalizeCastState, normalizeCharacter, normalizeCurrentContext, normalizeDirectorNotes, normalizeStory, normalizeStoryMemory, normalizeStoredLorebook } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { createId } from "../utils/helpers";
import {
  createInitialCastState, createInitialCurrentContext, chooseActiveCastLead,
  loadChatForStory, getStoryCharactersFromLists, uniqueCompact,
  syncDirectorNotesFromContext, syncCurrentContextFromDirectorNotes
} from "../utils/appHelpers";

export default function useStoryActions() {

  function saveCurrentContext({ activeStory, stories, saveStoryList }) {
    if (!activeStory) return;
    const nextContext = activeStory.currentContext;
    const normalizedContext = normalizeCurrentContext(nextContext);
    const syncedDirectorNotes = syncDirectorNotesFromContext(activeStory.directorNotes, normalizedContext);
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, currentContext: normalizedContext, directorNotes: syncedDirectorNotes } : s));
  }

  function saveSceneControl({ activeStory, stories, saveStoryList, nextContext, nextDirectorNotes }) {
    if (!activeStory) return;
    const normalizedContext = normalizeCurrentContext(nextContext);
    const normalizedDirectorNotes = normalizeDirectorNotes(nextDirectorNotes);
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, currentContext: normalizedContext, directorNotes: normalizedDirectorNotes } : s));
  }

  function saveStoryMemory({ activeStory, stories, saveStoryList, nextMemory }) {
    if (!activeStory) return;
    const normalizedMemory = normalizeStoryMemory(nextMemory);
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, storyMemory: normalizedMemory } : s));
  }

  function saveCastState({ activeStory, stories, saveStoryList, activeStoryCharacters, nextCastState }) {
    if (!activeStory) return;
    const normalizedCastState = normalizeCastState(nextCastState, activeStoryCharacters);
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, castState: normalizedCastState } : s));
  }

  function saveDirectorNotes({ activeStory, stories, saveStoryList, notes }) {
    if (!activeStory) return;
    const normalizedNotes = normalizeDirectorNotes(notes);
    const syncedContext = syncCurrentContextFromDirectorNotes(activeStory.currentContext, normalizedNotes);
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, directorNotes: normalizedNotes, currentContext: syncedContext } : s));
  }

  function clearDirectorNotes(deps) { saveDirectorNotes({ ...deps, notes: DEFAULT_DIRECTOR_NOTES }); }

  function openStoryCreationSheet(deps) {
    const { isGenerating, worlds, characters, activeWorld, activeCharacter, setActiveView, setStoryDraft } = deps;
    if (isGenerating) return;
    if (worlds.length === 0 || characters.length === 0) { alert("You need at least one world and one character to create a story."); return; }
    setStoryDraft({
      title: "Untitled Story", worldId: activeWorld?.id || worlds[0]?.id || "",
      characterIds: uniqueCompact([activeCharacter?.id || characters[0]?.id || ""]),
      scenario: "", greeting: "", storyLorebook: []
    });
    setActiveView("story-create");
  }

  function switchStory(deps) {
    const { isGenerating, stories, worlds, characters, repository, getStoryCharacters, ...rest } = deps;
    const { storyId } = deps;
    if (isGenerating) { alert("Please wait for the current reply to finish before switching stories."); return; }
    const story = stories.find((item) => item.id === storyId);
    if (!story) { alert("Story not found."); return; }
    rest.setActiveStoryId(story.id); repository.activeStory.set(story.id);
    rest.setChatHistory(loadChatForStory(story, worlds, characters));
    rest.setActiveLoreMemory(repository.loreMemory.load(story.id, []));
    rest.setSelectedCharacterSheetId(chooseActiveCastLead(story, getStoryCharacters(story))?.id || characters[0]?.id || "");
    rest.setSelectedWorldSheetId(story.worldId || worlds[0]?.id || "");
    rest.setStoryDraft(null); rest.setActiveView("story");
  }

  function startStoryFromCreationSheet(deps) {
    const { worlds, characters, stories, draft, saveWorldList, saveCharacterList, saveStoryList, repository, getStoryCharacters, ...rest } = deps;
    const world = worlds.find((item) => item.id === draft.worldId);
    const selectedCharacterIds = uniqueCompact(Array.isArray(draft.characterIds) ? draft.characterIds : []);
    const selectedCharacters = selectedCharacterIds.map((id) => characters.find((item) => item.id === id)).filter(Boolean);
    const leadCharacter = selectedCharacters[0] || null;
    if (!world) return { error: "Please choose a valid world." };
    if (selectedCharacters.length === 0) return { error: "Please choose at least one story character." };
    const newStory = normalizeStory({
      id: createId("story"), title: draft.title?.trim() || "Untitled Story", worldId: world.id,
      characterIds: selectedCharacters.map((item) => item.id), mainCharacterId: leadCharacter?.id || "",
      scenario: draft.scenario?.trim() || "", greeting: draft.greeting?.trim() || "The scene begins.",
      storyLorebook: normalizeStoredLorebook(draft.storyLorebook || []),
      storyMemory: normalizeStoryMemory({}), currentContext: createInitialCurrentContext(world),
      castState: createInitialCastState(selectedCharacters), createdAt: Date.now()
    }, worlds, characters);
    saveStoryList([...stories, newStory]);
    rest.setActiveStoryId(newStory.id); repository.activeStory.set(newStory.id);
    const opening = [{ role: "assistant", content: buildOpeningMessage(newStory, leadCharacter, world, selectedCharacters) }];
    rest.setChatHistory(opening); repository.chats.save(newStory.id, opening);
    rest.setActiveLoreMemory([]); repository.loreMemory.save(newStory.id, [], { quiet: true });
    rest.setSelectedCharacterSheetId(leadCharacter?.id || ""); rest.setSelectedWorldSheetId(world.id);
    rest.setStoryDraft(null); rest.setActiveView("story");
    return { ok: true };
  }

  function cancelStoryCreation({ activeStory, setActiveView, setStoryDraft }) {
    setStoryDraft(null); setActiveView(activeStory?.id ? "story" : "landing");
  }

  function deleteActiveStory(deps) {
    const { activeStory, stories, repository, saveStoryList, clearActiveStorySelection } = deps;
    if (!activeStory) { alert("No active story to delete."); return; }
    if (!confirm(`Delete story "${activeStory.title}"? This will delete its chat and lore memory.`)) return;
    repository.maintenance.removeStoryRuntimeData(activeStory.id);
    saveStoryList(stories.filter((s) => s.id !== activeStory.id));
    clearActiveStorySelection();
  }

  function assignWorldToStory(deps) {
    const { activeStory, worlds, getStoryCharacters, getWorld, stories, saveStoryList, resetCurrentStoryState, ...rest } = deps;
    const { worldId } = deps;
    if (!activeStory || worldId === activeStory.worldId) return;
    const world = getWorld(worldId);
    if (!world) return alert("World not found.");
    if (!confirm("Use this world in the active story? This will reset the story chat and rebuild Current Context for the new world.")) return;
    const storyCharacters = getStoryCharacters(activeStory);
    const rebuiltContext = createInitialCurrentContext(world, storyCharacters);
    const updatedStory = { ...activeStory, worldId: world.id, currentContext: rebuiltContext, directorNotes: syncDirectorNotesFromContext(activeStory.directorNotes, rebuiltContext) };
    const nextStories = deps.stories.map((s) => s.id === activeStory.id ? updatedStory : s);
    deps.saveStoryList(nextStories);
    resetCurrentStoryState(activeStory.id, updatedStory, world, storyCharacters);
    rest.setSelectedWorldSheetId(world.id); rest.setActiveView("story");
  }

  return {
    saveCurrentContext, saveSceneControl, saveStoryMemory, saveCastState,
    saveDirectorNotes, clearDirectorNotes,
    openStoryCreationSheet, switchStory, startStoryFromCreationSheet,
    cancelStoryCreation, deleteActiveStory, assignWorldToStory,
  };
}
