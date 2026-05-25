// Character CRUD hook — creation, editing, deletion, presence, story membership.

import { normalizeCastState, normalizeCharacter, normalizeCurrentContext } from "../services/normalizers.js";
import { createId } from "../utils/helpers.js";
import { normalizeCastPresence, uniqueCompact } from "../utils/appHelpers.js";

export default function useCharacterActions() {

  function createBlankCharacter(deps) {
    const { isGenerating, worlds, characters, selectedWorldSheetId, activeWorld, saveCharacterList, setSelectedCharacterSheetId, setActiveView, setStoryDraft } = deps;
    if (isGenerating) return;
    const newCharacter = normalizeCharacter({
      id: createId("character"),
      worldId: selectedWorldSheetId || activeWorld?.id || worlds[0]?.id || "",
      name: "New Character", shortDescription: "Blank character template", lorebook: []
    }, worlds);
    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId(newCharacter.id); setActiveView("character"); setStoryDraft(null);
  }

  function saveCharacterSheetEdits({ characterDraft, characters, worlds, saveCharacterList }) {
    const normalized = normalizeCharacter(characterDraft, worlds);
    saveCharacterList(characters.map((c) => c.id === normalized.id ? normalized : c));
  }

  function saveStoryCastIdentity({ characterDraft, characters, worlds, saveCharacterList, setSelectedCharacterSheetId }) {
    const normalized = normalizeCharacter(characterDraft, worlds);
    saveCharacterList(characters.map((c) => c.id === normalized.id ? normalized : c));
    setSelectedCharacterSheetId(normalized.id);
  }

  function deleteSelectedCharacter(deps) {
    const { characters, stories, characterId, getCharacter, saveCharacterList, repository, setSelectedCharacterSheetId, setActiveView } = deps;
    const character = getCharacter(characterId);
    if (!character) return;
    const storiesUsingCharacter = stories.filter((s) => (s.characterIds || []).includes(character.id));
    if (storiesUsingCharacter.length > 0) {
      const storyNames = storiesUsingCharacter.map((s) => `"${s.title}"`).join(", ");
      alert(`Cannot delete ${character.name}. This character is used in ${storiesUsingCharacter.length} story(s): ${storyNames}.\n\nDelete these stories first.`);
      return;
    }
    if (!confirm(`Delete ${character.name}?`)) return;
    saveCharacterList(characters.filter((item) => item.id !== character.id));
    repository.characters.removeLegacyChat(character.id);
    setSelectedCharacterSheetId(characters.find((item) => item.id !== character.id)?.id || "");
    setActiveView("landing");
  }

  function setCharacterPresenceInActiveStory(deps) {
    const { activeStory, characterId, presence, getCharacter, getStoryCharacters, stories, saveStoryList, setSelectedCharacterSheetId, setActiveView } = deps;
    if (!activeStory) return;
    const character = getCharacter(characterId);
    if (!character) return alert("Character not found.");
    const normalizedPresence = normalizeCastPresence(presence);
    const storyCharacters = getStoryCharacters(activeStory);
    const nextCastState = normalizeCastState(activeStory.castState, storyCharacters, activeStory.currentContext);
    const row = nextCastState.activeCharacters.find((item) => item.characterId === character.id);
    if (row) { row.presence = normalizedPresence; row.present = normalizedPresence !== "inactive"; }
    saveStoryList(stories.map((s) => s.id === activeStory.id ? { ...s, castState: nextCastState } : s));
    setSelectedCharacterSheetId(character.id); setActiveView("story");
  }

  function addCharacterToActiveStory(deps) {
    const { activeStory, characterId, getCharacter, getCharacter: gc, characters, stories, saveStoryList, setSelectedCharacterSheetId } = deps;
    if (!activeStory) return;
    const character = getCharacter(characterId);
    if (!character) return alert("Character not found.");
    saveStoryList(stories.map((story) => {
      if (story.id !== activeStory.id) return story;
      const nextCharacterIds = uniqueCompact([...(story.characterIds || []), character.id]);
      const storyCharacters = nextCharacterIds.map(gc).filter(Boolean);
      const nextCastState = normalizeCastState(story.castState, storyCharacters, story.currentContext);
      return { ...story, characterIds: nextCharacterIds, mainCharacterId: story.mainCharacterId || nextCharacterIds[0] || "", currentContext: normalizeCurrentContext(story.currentContext), castState: nextCastState };
    }));
    setSelectedCharacterSheetId(character.id);
  }

  function removeCharacterFromActiveStory(deps) {
    const { activeStory, characterId, getCharacter, characters, stories, saveStoryList, setSelectedCharacterSheetId } = deps;
    if (!activeStory) return;
    const remainingIds = (activeStory.characterIds || []).filter((id) => id !== characterId);
    if (remainingIds.length === 0) { alert("A story needs at least one cast member."); return; }
    saveStoryList(stories.map((story) => {
      if (story.id !== activeStory.id) return story;
      const storyCharacters = remainingIds.map(getCharacter).filter(Boolean);
      const nextCastState = normalizeCastState(story.castState, storyCharacters, story.currentContext);
      return { ...story, characterIds: remainingIds, mainCharacterId: remainingIds.includes(story.mainCharacterId) ? story.mainCharacterId : remainingIds[0], currentContext: normalizeCurrentContext(story.currentContext), castState: nextCastState };
    }));
    setSelectedCharacterSheetId(remainingIds[0] || "");
  }

  return {
    createBlankCharacter, saveCharacterSheetEdits, saveStoryCastIdentity,
    deleteSelectedCharacter, setCharacterPresenceInActiveStory,
    addCharacterToActiveStory, removeCharacterFromActiveStory,
  };
}
