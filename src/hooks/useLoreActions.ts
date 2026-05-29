import { Character, World, Story, LoreEntry } from "../types";
import { repository } from "../services/repository";
import { inspectLoreInjection, buildNextActiveLoreMemory, getCombinedRuntimeLorebook } from "../services/lore";
import { resolveEffectiveStoryCharacters } from "../services/storyCharacters";
import { normalizeCharacter } from "../services/normalizers";

interface LoreActionDeps {
  activeStory: Story | null;
  activeWorld: World | null;
  characters: Character[];
  saveActiveStory: (story: Story) => void;
  activeLoreMemory: LoreEntry[];
  setActiveLoreMemory: (memory: LoreEntry[]) => void;
  saveLoreForActiveStory: (memory: LoreEntry[]) => void;
  index?: number;
  patch?: any;
  characterId?: string;
  lorebook?: LoreEntry[];
  story?: Story | null;
}

export default function useLoreActions() {
  function updateStoryLore(deps: LoreActionDeps) {
    const { activeStory, saveActiveStory, index, patch } = deps;
    if (!activeStory || index === undefined) return;
    const nextLorebook = [...(activeStory.storyLorebook || [])];
    nextLorebook[index] = { ...nextLorebook[index], ...patch };
    const nextStory = { ...activeStory, storyLorebook: nextLorebook };
    saveActiveStory(nextStory);
    pruneAndSaveLore({ ...deps, activeStory: nextStory });
  }

  function updateWorldLore(deps: LoreActionDeps) {
    const { activeWorld, worlds, saveWorldList, index, patch } = deps as any;
    if (!activeWorld || index === undefined) return;
    const nextLorebook = [...(activeWorld.worldLorebook || [])];
    nextLorebook[index] = { ...nextLorebook[index], ...patch };
    const nextWorld = { ...activeWorld, worldLorebook: nextLorebook };
    saveWorldList(worlds.map((w: World) => (w.id === nextWorld.id ? nextWorld : w)));
    pruneAndSaveLore({ ...deps, activeWorld: nextWorld });
  }

  function updateCharacterLore(deps: LoreActionDeps) {
    const { characterId, index, patch, characters, saveCharacterList } = deps as any;
    if (!characterId || index === undefined) return;
    const targetCharacter = characters.find((c: Character) => c.id === characterId);
    if (!targetCharacter) return;
    const nextLorebook = [...(targetCharacter.lorebook || [])];
    nextLorebook[index] = { ...nextLorebook[index], ...patch };
    const nextCharacter = normalizeCharacter({ ...targetCharacter, lorebook: nextLorebook });
    const nextCharacters = characters.map((c: Character) => (c.id === nextCharacter.id ? nextCharacter : c));
    saveCharacterList(nextCharacters);
    pruneAndSaveLore({ ...deps, characters: nextCharacters });
  }

  function saveTemporaryLore(deps: LoreActionDeps) {
    const { activeStory, saveActiveStory, lorebook } = deps;
    if (!activeStory) return;
    const nextStory = { ...activeStory, temporaryLorebook: lorebook || [] };
    saveActiveStory(nextStory);
    pruneAndSaveLore({ ...deps, activeStory: nextStory });
  }

  function clearTemporaryLore(deps: LoreActionDeps) {
    saveTemporaryLore({ ...deps, lorebook: [] });
  }

  function pruneAndSaveLore(deps: LoreActionDeps) {
    const { story, activeWorld, characters, activeLoreMemory, setActiveLoreMemory, saveLoreForActiveStory } = deps;
    if (!story || !activeWorld) return;
    const effectiveCharacters = resolveEffectiveStoryCharacters(story, characters);
    const combinedLorebook = getCombinedRuntimeLorebook({ story, world: activeWorld, characters: effectiveCharacters });
    const nextMemory = buildNextActiveLoreMemory(activeLoreMemory, [], combinedLorebook);
    setActiveLoreMemory(nextMemory);
    saveLoreForActiveStory(nextMemory);
  }

  function refreshActiveLore(deps: any) {
    const { activeStory, activeWorld, activeStoryCharacters, chatHistory, activeLoreMemory, setActiveLoreMemory, saveLoreForActiveStory } = deps;
    if (!activeStory || !activeWorld) return;
    const inspection = inspectLoreInjection({
      story: activeStory,
      world: activeWorld,
      characters: activeStoryCharacters,
      history: chatHistory,
      activeLoreMemory,
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
  };
}
