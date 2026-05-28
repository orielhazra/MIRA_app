// Character CRUD hook — creation, editing, deletion, presence, story membership.

import { Character, Story, World } from "../types/index";
import { normalizeCastState, normalizeCharacter, normalizeCurrentContext } from "../services/normalizers";
import { createId } from "../utils/helpers";
import { normalizeCastPresence, uniqueCompact } from "../utils/appHelpers";

interface CharacterActionDeps {
  isGenerating?: boolean;
  worlds?: World[];
  characters?: Character[];
  selectedWorldSheetId?: string;
  activeWorld?: World | null;
  saveCharacterList?: (chars: Character[]) => void;
  setSelectedCharacterSheetId?: (id: string) => void;
  setActiveView?: (view: string) => void;
  setStoryDraft?: (draft: any) => void;
  characterDraft?: Character;
  storyMetas?: { id: string; title: string; characterIds: string[] }[];
  characterId?: string;
  getCharacter?: (id: string) => Character | null;
  repository?: any;
  activeStory?: Story | null;
  presence?: string;
  saveActiveStory?: (story: Story) => void;
}

export default function useCharacterActions() {
  function createBlankCharacter(deps: CharacterActionDeps) {
    const {
      isGenerating,
      worlds,
      characters,
      selectedWorldSheetId,
      activeWorld,
      saveCharacterList,
      setSelectedCharacterSheetId,
      setActiveView,
      setStoryDraft,
    } = deps;

    if (isGenerating || !worlds || !characters || !saveCharacterList) return;

    const newCharacter = normalizeCharacter(
      {
        id: createId("character"),
        name: "New Character",
        shortDescription: "Blank character template",
        lorebook: [],
      },
      worlds
    );

    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId?.(newCharacter.id);
    setActiveView?.("character");
    setStoryDraft?.(null);
  }

  function saveCharacterSheetEdits({ characterDraft, characters, worlds, saveCharacterList }: CharacterActionDeps) {
    if (!characterDraft || !characters || !saveCharacterList) return;
    const normalized = normalizeCharacter(characterDraft, worlds || []);
    saveCharacterList(characters.map((c) => (c.id === normalized.id ? normalized : c)));
  }

  function saveStoryCastIdentity({ characterDraft, characters, worlds, saveCharacterList, setSelectedCharacterSheetId }: CharacterActionDeps) {
    if (!characterDraft || !characters || !saveCharacterList) return;
    const normalized = normalizeCharacter(characterDraft, worlds || []);
    saveCharacterList(characters.map((c) => (c.id === normalized.id ? normalized : c)));
    setSelectedCharacterSheetId?.(normalized.id);
  }

  function deleteSelectedCharacter(deps: CharacterActionDeps) {
    const { characters, storyMetas = [], characterId, getCharacter, saveCharacterList, repository, setSelectedCharacterSheetId, setActiveView } = deps;
    if (!characters || !getCharacter || !saveCharacterList) return;

    const character = getCharacter(characterId!);
    if (!character) return;

    const storiesUsingCharacter = storyMetas.filter((meta) => (meta.characterIds || []).includes(character.id));
    if (storiesUsingCharacter.length > 0) {
      const storyNames = storiesUsingCharacter.map((s) => `"${s.title}"`).join(", ");
      alert(`Cannot delete ${character.name}. This character is used in ${storiesUsingCharacter.length} story(s): ${storyNames}.

Delete these stories first.`);
      return;
    }

    if (!confirm(`Delete ${character.name}?`)) return;

    saveCharacterList(characters.filter((item) => item.id !== character.id));
    repository?.characters.removeLegacyChat?.(character.id);
    setSelectedCharacterSheetId?.(characters.find((item) => item.id !== character.id)?.id || "");
    setActiveView?.("landing");
  }

  function setCharacterPresenceInActiveStory(deps: CharacterActionDeps) {
    const {
      activeStory,
      characterId,
      presence,
      getCharacter,
      saveActiveStory,
      setSelectedCharacterSheetId,
      setActiveView,
    } = deps;

    if (!activeStory || !getCharacter || !saveActiveStory || !characterId) return;

    const character = getCharacter(characterId);
    if (!character) return alert("Character not found.");

    const normalizedPresence = normalizeCastPresence(presence);
    const storyCharacters = (activeStory.characterIds || []).map((id) => getCharacter(id)).filter(Boolean) as Character[];
    const nextCastState = normalizeCastState(activeStory.castState, storyCharacters, activeStory.currentContext);
    const row = nextCastState.activeCharacters.find((item) => item.characterId === character.id);

    if (row) {
      row.presence = normalizedPresence;
      row.present = normalizedPresence !== "inactive";
    }

    saveActiveStory({ ...activeStory, castState: nextCastState });
    setSelectedCharacterSheetId?.(character.id);
    setActiveView?.("story");
  }

  function addCharacterToActiveStory(deps: CharacterActionDeps) {
    const {
      activeStory,
      characterId,
      getCharacter,
      saveActiveStory,
      setSelectedCharacterSheetId,
    } = deps;

    if (!activeStory || !getCharacter || !saveActiveStory || !characterId) return;

    const character = getCharacter(characterId);
    if (!character) return alert("Character not found.");

    const nextCharacterIds = uniqueCompact([...(activeStory.characterIds || []), character.id]);
    const storyCharacters = nextCharacterIds.map((id) => getCharacter(id)).filter(Boolean) as Character[];
    const nextCastState = normalizeCastState(activeStory.castState, storyCharacters, activeStory.currentContext);

    saveActiveStory({
      ...activeStory,
      characterIds: nextCharacterIds,
      currentContext: normalizeCurrentContext(activeStory.currentContext),
      castState: nextCastState,
    });
    setSelectedCharacterSheetId?.(character.id);
  }

  function removeCharacterFromActiveStory(deps: CharacterActionDeps) {
    const {
      activeStory,
      characterId,
      getCharacter,
      saveActiveStory,
      setSelectedCharacterSheetId,
    } = deps;

    if (!activeStory || !getCharacter || !saveActiveStory || !characterId) return;

    const remainingIds = (activeStory.characterIds || []).filter((id) => id !== characterId);
    if (remainingIds.length === 0) {
      alert("A story needs at least one cast member.");
      return;
    }

    const storyCharacters = remainingIds.map((id) => getCharacter(id)).filter(Boolean) as Character[];
    const nextCastState = normalizeCastState(activeStory.castState, storyCharacters, activeStory.currentContext);

    saveActiveStory({
      ...activeStory,
      characterIds: remainingIds,
      currentContext: normalizeCurrentContext(activeStory.currentContext),
      castState: nextCastState,
    });
    setSelectedCharacterSheetId?.(remainingIds[0] || "");
  }

  return {
    createBlankCharacter,
    saveCharacterSheetEdits,
    saveStoryCastIdentity,
    deleteSelectedCharacter,
    setCharacterPresenceInActiveStory,
    addCharacterToActiveStory,
    removeCharacterFromActiveStory,
  };
}
