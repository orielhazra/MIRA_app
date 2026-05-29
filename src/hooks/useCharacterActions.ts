// Character CRUD hook — creation, editing, deletion, presence, story membership.

import { Character, Story, World, StoryCastMember } from "../types/index";
import { normalizeCastState, normalizeCharacter, normalizeCurrentContext } from "../services/normalizers";
import { createId } from "../utils/helpers";
import { normalizeCastPresence, uniqueCompact } from "../utils/appHelpers";
import { createEmptyCharacterOverlay } from "../constants/defaultData";
import { resolveEffectiveStoryCharacters } from "../services/storyCharacters";

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
  storyMetas?: { id: string; title: string; castMemberCount: number }[];
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
      characters,
      saveCharacterList,
      setSelectedCharacterSheetId,
      setActiveView,
      setStoryDraft,
    } = deps;

    if (isGenerating || !characters || !saveCharacterList) return;

    const newCharacter = normalizeCharacter(
      {
        id: createId("character"),
        name: "New Character",
        shortDescription: "Blank character template",
        lorebook: [],
      }
    );

    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId?.(newCharacter.id);
    setActiveView?.("character");
    setStoryDraft?.(null);
  }

  function saveCharacterSheetEdits({ characterDraft, characters, saveCharacterList }: CharacterActionDeps) {
    if (!characterDraft || !characters || !saveCharacterList) return;
    
    const existing = characters.find(c => c.id === characterDraft.id);
    const templateKey = characterDraft.templateKey || characterDraft.id || createId("char-key");
    const templateVersion = (characterDraft.templateVersion || 1) + (existing ? 1 : 0);

    const nextCharacter = normalizeCharacter({
      ...characterDraft,
      id: createId("character"),
      templateKey,
      templateVersion
    });
    
    saveCharacterList([...characters, nextCharacter]);
  }

  function deleteSelectedCharacter(deps: CharacterActionDeps) {
    const { characters, characterId, getCharacter, saveCharacterList, repository, setSelectedCharacterSheetId, setActiveView } = deps;
    if (!characters || !getCharacter || !saveCharacterList) return;

    const character = getCharacter(characterId!);
    if (!character) return;

    // We should check if any stories are using this specific template version.
    // However, storyMetas doesn't have the cast member info anymore. 
    // For now, we'll allow deletion but caution. 
    // A better approach would be to check the repository for all full stories.
    
    if (!confirm(`Delete template ${character.name} (v${character.templateVersion || 1})?`)) return;

    saveCharacterList(characters.filter((item) => item.id !== character.id));
    // repository?.characters.removeLegacyChat?.(character.id); // Character chats are gone now
    setSelectedCharacterSheetId?.(characters.find((item) => item.id !== character.id)?.id || "");
    setActiveView?.("landing");
  }

  function setCharacterPresenceInActiveStory(deps: CharacterActionDeps) {
    const {
      activeStory,
      characterId, // This might be castMemberId or templateCharacterId
      presence,
      characters = [],
      saveActiveStory,
      setSelectedCharacterSheetId,
      setActiveView,
    } = deps;

    if (!activeStory || !saveActiveStory || !characterId) return;

    const castMember = activeStory.castMembers.find(m => m.id === characterId || m.templateCharacterId === characterId);
    if (!castMember) return alert("Cast member not found.");

    const normalizedPresence = normalizeCastPresence(presence);
    const effectiveCharacters = resolveEffectiveStoryCharacters(activeStory, characters);
    const nextCastState = normalizeCastState(activeStory.castState, activeStory.castMembers, effectiveCharacters);
    const row = nextCastState.activeCharacters.find((item) => item.castMemberId === castMember.id);

    if (row) {
      row.presence = normalizedPresence;
      row.present = normalizedPresence !== "inactive";
    }

    saveActiveStory({ ...activeStory, castState: nextCastState });
    setSelectedCharacterSheetId?.(castMember.templateCharacterId);
    setActiveView?.("story");
  }

  function addCharacterToActiveStory(deps: CharacterActionDeps) {
    const {
      activeStory,
      characterId,
      characters = [],
      getCharacter,
      saveActiveStory,
      setSelectedCharacterSheetId,
    } = deps;

    if (!activeStory || !getCharacter || !saveActiveStory || !characterId) return;

    const template = getCharacter(characterId);
    if (!template) return alert("Character template not found.");

    // Check if already in story
    if (activeStory.castMembers.some(m => m.templateCharacterId === template.id)) {
      alert("Character is already in the story cast.");
      return;
    }

    const newCastMember: StoryCastMember = {
      id: createId("cast"),
      templateCharacterId: template.id,
      templateCharacterKey: template.templateKey || template.id,
      templateCharacterVersion: template.templateVersion || 1,
      overlay: createEmptyCharacterOverlay()
    };

    const nextCastMembers = [...activeStory.castMembers, newCastMember];
    const effectiveCharacters = resolveEffectiveStoryCharacters({...activeStory, castMembers: nextCastMembers}, characters);
    const nextCastState = normalizeCastState(activeStory.castState, nextCastMembers, effectiveCharacters);

    saveActiveStory({
      ...activeStory,
      castMembers: nextCastMembers,
      currentContext: normalizeCurrentContext(activeStory.currentContext),
      castState: nextCastState,
    });
    setSelectedCharacterSheetId?.(template.id);
  }

  function removeCharacterFromActiveStory(deps: CharacterActionDeps) {
    const {
      activeStory,
      characterId,
      characters = [],
      saveActiveStory,
      setSelectedCharacterSheetId,
    } = deps;

    if (!activeStory || !saveActiveStory || !characterId) return;

    const castMember = activeStory.castMembers.find(m => m.id === characterId || m.templateCharacterId === characterId);
    if (!castMember) return;

    const remainingCast = activeStory.castMembers.filter((m) => m.id !== castMember.id);
    if (remainingCast.length === 0) {
      alert("A story needs at least one cast member.");
      return;
    }

    const effectiveCharacters = resolveEffectiveStoryCharacters({...activeStory, castMembers: remainingCast}, characters);
    const nextCastState = normalizeCastState(activeStory.castState, remainingCast, effectiveCharacters);

    saveActiveStory({
      ...activeStory,
      castMembers: remainingCast,
      currentContext: normalizeCurrentContext(activeStory.currentContext),
      castState: nextCastState,
    });
    setSelectedCharacterSheetId?.(remainingCast[0]?.templateCharacterId || "");
  }

  return {
    createBlankCharacter,
    saveCharacterSheetEdits,
    deleteSelectedCharacter,
    setCharacterPresenceInActiveStory,
    addCharacterToActiveStory,
    removeCharacterFromActiveStory,
  };
}
