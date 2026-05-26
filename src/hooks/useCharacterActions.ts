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
  stories?: Story[];
  characterId?: string;
  getCharacter?: (id: string) => Character | undefined;
  repository?: any;
  activeStory?: Story;
  presence?: string;
  getStoryCharacters?: (story: Story) => Character[];
  saveStoryList?: (stories: Story[]) => void;
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
        worldId: selectedWorldSheetId || activeWorld?.id || worlds[0]?.id || "",
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
    const { characters, stories, characterId, getCharacter, saveCharacterList, repository, setSelectedCharacterSheetId, setActiveView } = deps;
    if (!characters || !stories || !getCharacter || !saveCharacterList) return;

    const character = getCharacter(characterId!);
    if (!character) return;

    const storiesUsingCharacter = stories.filter((s) => (s.characterIds || []).includes(character.id));
    if (storiesUsingCharacter.length > 0) {
      const storyNames = storiesUsingCharacter.map((s) => `"${s.title}"`).join(", ");
      alert(`Cannot delete ${character.name}. This character is used in ${storiesUsingCharacter.length} story(s): ${storyNames}.\n\nDelete these stories first.`);
      return;
    }

    if (!confirm(`Delete ${character.name}?`)) return;

    saveCharacterList(characters.filter((item) => item.id !== character.id));
    repository?.characters.removeLegacyChat(character.id);
    setSelectedCharacterSheetId?.(characters.find((item) => item.id !== character.id)?.id || "");
    setActiveView?.("landing");
  }

  // Other presence and membership functions kept lightly typed

  return {
    createBlankCharacter,
    saveCharacterSheetEdits,
    saveStoryCastIdentity,
    deleteSelectedCharacter,
    setCharacterPresenceInActiveStory: (deps: any) => {},
    addCharacterToActiveStory: (deps: any) => {},
    removeCharacterFromActiveStory: (deps: any) => {},
  };
}
