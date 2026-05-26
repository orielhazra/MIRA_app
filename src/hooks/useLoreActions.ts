// Lore operations hook — lorebook updates, temporary lore, refresh, prune.

import { LoreEntry, Story, World, Character } from "../types/index";
import { normalizeStoredLorebook } from "../services/normalizers";
import { getCombinedRuntimeLorebook, inspectLoreInjection, pruneActiveLoreMemory } from "../services/lore";
import { getStoryCharactersFromLists } from "../utils/appHelpers";

interface LoreActionDeps {
  activeStory?: Story;
  stories?: Story[];
  activeWorld?: World;
  activeCharacter?: Character | null;
  characters?: Character[];
  saveStoryList?: (stories: Story[]) => void;
  saveWorldList?: (worlds: World[]) => void;
  saveCharacterList?: (characters: Character[]) => void;
  activeLoreMemory?: LoreEntry[];
  setActiveLoreMemory?: (memory: LoreEntry[]) => void;
  saveLoreForActiveStory?: (memory: LoreEntry[]) => void;
  index?: number;
  patch?: Partial<LoreEntry>;
  lorebook?: LoreEntry[];
  story?: Story;
  chatHistory?: any[];
  activeStoryCharacters?: Character[];
  characterId?: string;
}

export default function useLoreActions() {
  function updateStoryLore(deps: LoreActionDeps) {
    const {
      activeStory,
      stories,
      activeWorld,
      activeCharacter,
      characters,
      saveStoryList,
      activeLoreMemory,
      setActiveLoreMemory,
      saveLoreForActiveStory,
      index,
      patch,
    } = deps;

    if (!activeStory || !saveStoryList) return;

    const nextLore = (activeStory.storyLorebook || []).map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry
    );

    saveStoryList(stories!.map((s) => (s.id === activeStory.id ? { ...s, storyLorebook: nextLore } : s)));

    pruneAndSaveLore({ ...deps, story: stories!.find((s) => s.id === activeStory.id) });
  }

  function updateWorldLore(deps: LoreActionDeps) {
    const { activeWorld, worlds, saveWorldList, index, patch, ...rest } = deps;
    if (!activeWorld || !saveWorldList || !worlds) return;

    const nextLore = (activeWorld.worldLorebook || []).map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry
    );

    const nextWorlds = worlds.map((w) => (w.id === activeWorld.id ? { ...w, worldLorebook: nextLore } : w));
    saveWorldList(nextWorlds);

    pruneAndSaveLore({ ...rest, activeWorld: nextWorlds.find((w) => w.id === activeWorld.id) });
  }

  function updateCharacterLore(deps: LoreActionDeps) {
    const { characterId, index, patch, characters, saveCharacterList, ...rest } = deps;
    if (!characters || !saveCharacterList) return;

    const targetCharacter = characters.find((c) => c.id === characterId) || rest.activeCharacter;
    if (!targetCharacter) return;

    const nextLore = (targetCharacter.lorebook || []).map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry
    );

    const nextCharacters = characters.map((c) =>
      c.id === targetCharacter.id ? { ...c, lorebook: nextLore } : c
    );

    saveCharacterList(nextCharacters);
    pruneAndSaveLore({ ...rest, characters: nextCharacters, activeCharacter: nextCharacters.find((c) => c.id === targetCharacter.id) });
  }

  function saveTemporaryLore(deps: LoreActionDeps) {
    const { activeStory, stories, saveStoryList, lorebook } = deps;
    if (!activeStory || !saveStoryList || !stories) return;

    saveStoryList(
      stories.map((s) =>
        s.id === activeStory.id ? { ...s, temporaryLorebook: normalizeStoredLorebook(lorebook) } : s
      )
    );

    pruneAndSaveLore({ ...deps, story: stories.find((s) => s.id === activeStory.id) });
  }

  function clearTemporaryLore(deps: LoreActionDeps) {
    saveTemporaryLore({ ...deps, lorebook: [] });
  }

  function pruneAndSaveLore(deps: LoreActionDeps) {
    const { story, activeWorld, activeCharacter, characters, activeLoreMemory, setActiveLoreMemory, saveLoreForActiveStory } = deps;
    if (!story || !setActiveLoreMemory || !saveLoreForActiveStory) return;

    const storyChars = getStoryCharactersFromLists(story, characters || []);
    const combinedLorebook = getCombinedRuntimeLorebook({
      story,
      world: activeWorld!,
      character: activeCharacter || null,
      characters: storyChars,
    });

    const nextLoreMemory = pruneActiveLoreMemory(activeLoreMemory || [], combinedLorebook);
    setActiveLoreMemory(nextLoreMemory);
    saveLoreForActiveStory(nextLoreMemory);
  }

  function refreshActiveLore(deps: LoreActionDeps) {
    const {
      activeStory,
      activeWorld,
      activeCharacter,
      activeStoryCharacters,
      chatHistory,
      activeLoreMemory,
      setActiveLoreMemory,
      saveLoreForActiveStory,
    } = deps;

    if (!activeStory || !setActiveLoreMemory || !saveLoreForActiveStory) return;

    const inspection = inspectLoreInjection({
      story: activeStory,
      world: activeWorld!,
      character: activeCharacter || null,
      characters: activeStoryCharacters || [],
      history: chatHistory || [],
      activeLoreMemory: activeLoreMemory || [],
    });

    setActiveLoreMemory(inspection.nextMemory);
    saveLoreForActiveStory(inspection.nextMemory);
  }

  return {
    updateStoryLore,
    updateWorldLore,
    updateCharacterLore,
    saveTemporaryLore,
    clearTemporaryLore,
    refreshActiveLore,
    pruneAndSaveLore,
  };
}
