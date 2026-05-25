// Lore operations hook — lorebook updates, temporary lore, refresh, prune.

import { normalizeStoredLorebook } from "../services/normalizers.js";
import { getCombinedRuntimeLorebook, inspectLoreInjection, pruneActiveLoreMemory } from "../services/lore.js";
import { getStoryCharactersFromLists } from "../utils/appHelpers.js";

export default function useLoreActions() {

  function updateStoryLore(deps) {
    const { activeStory, stories, activeWorld, activeCharacter, characters, saveStoryList, activeLoreMemory, setActiveLoreMemory, saveLoreForActiveStory, index, patch } = deps;
    if (!activeStory) return;
    const nextLore = (activeStory.storyLorebook || []).map((entry, i) => i === index ? { ...entry, ...patch } : entry);
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, storyLorebook: nextLore } : s));
    pruneAndSaveLore({ ...deps, story: stories.find((s) => s.id === activeStory.id) });
  }

  function updateWorldLore(deps) {
    const { activeWorld, worlds, activeStory, activeCharacter, characters, saveWorldList, saveStoryList: _unused, stories, index, patch, ...rest } = deps;
    if (!activeWorld) return;
    const nextLore = (activeWorld.worldLorebook || []).map((entry, i) => i === index ? { ...entry, ...patch } : entry);
    const nextWorlds = worlds.map((w) => w.id === activeWorld.id ? { ...w, worldLorebook: nextLore } : w);
    saveWorldList(nextWorlds);
    pruneAndSaveLore({ ...rest, activeStory, worlds: nextWorlds, activeWorld: nextWorlds.find((w) => w.id === activeWorld.id), characters, story: activeStory });
  }

  function updateCharacterLore(deps) {
    const { characterId, index, patch, activeCharacter, characters, activeStory, activeWorld, saveCharacterList, ...rest } = deps;
    const targetCharacter = characters.find((c) => c.id === characterId) || activeCharacter;
    if (!targetCharacter) return;
    const nextLore = (targetCharacter.lorebook || []).map((entry, i) => i === index ? { ...entry, ...patch } : entry);
    const nextCharacters = characters.map((c) => c.id === targetCharacter.id ? { ...c, lorebook: nextLore } : c);
    saveCharacterList(nextCharacters);
    pruneAndSaveLore({ ...rest, activeStory, activeWorld, characters: nextCharacters, activeCharacter: nextCharacters.find((c) => c.id === targetCharacter.id), story: activeStory });
  }

  function saveTemporaryLore(deps) {
    const { activeStory, stories, activeWorld, activeCharacter, characters, saveStoryList, lorebook } = deps;
    if (!activeStory) return;
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, temporaryLorebook: normalizeStoredLorebook(lorebook) } : s));
    pruneAndSaveLore({ ...deps, story: stories.find((s) => s.id === activeStory.id) });
  }

  function clearTemporaryLore(deps) { saveTemporaryLore({ ...deps, lorebook: [] }); }

  function pruneAndSaveLore(deps) {
    const { story, activeWorld, activeCharacter, characters, activeLoreMemory, setActiveLoreMemory, saveLoreForActiveStory } = deps;
    const storyChars = getStoryCharactersFromLists(story, characters);
    const combinedLorebook = getCombinedRuntimeLorebook({ story, world: activeWorld, character: activeCharacter, characters: storyChars });
    const nextLoreMemory = pruneActiveLoreMemory(activeLoreMemory, combinedLorebook);
    setActiveLoreMemory(nextLoreMemory); saveLoreForActiveStory(nextLoreMemory);
  }

  function refreshActiveLore(deps) {
    const { activeStory, activeWorld, activeCharacter, activeStoryCharacters, chatHistory, activeLoreMemory, setActiveLoreMemory, saveLoreForActiveStory } = deps;
    if (!activeStory) return;
    const inspection = inspectLoreInjection({ story: activeStory, world: activeWorld, character: activeCharacter, characters: activeStoryCharacters, history: chatHistory, activeLoreMemory });
    setActiveLoreMemory(inspection.nextMemory); saveLoreForActiveStory(inspection.nextMemory);
  }

  return {
    updateStoryLore, updateWorldLore, updateCharacterLore,
    saveTemporaryLore, clearTemporaryLore, refreshActiveLore, pruneAndSaveLore,
  };
}
