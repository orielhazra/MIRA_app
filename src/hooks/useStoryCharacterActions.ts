import { Story, StoryCharacterOverlay, LoreEntry, Character } from "../types/index";
import { normalizeStoryCharacterOverlay } from "../services/normalizers";
import { createId } from "../utils/helpers";

interface StoryCharacterActionDeps {
  activeStory: Story | null;
  characters: Character[];
  saveActiveStory: (story: Story) => void;
}

export default function useStoryCharacterActions() {
  function updateStoryCharacterPatch(
    castMemberId: string,
    patch: Partial<StoryCharacterOverlay["identityPatch"]>,
    { activeStory, saveActiveStory }: StoryCharacterActionDeps
  ) {
    if (!activeStory || !saveActiveStory) return;

    const nextCastMembers = activeStory.castMembers.map(member => {
      if (member.id !== castMemberId) return member;
      
      return {
        ...member,
        overlay: {
          ...member.overlay,
          identityPatch: {
            ...member.overlay.identityPatch,
            ...patch
          }
        }
      };
    });

    saveActiveStory({ ...activeStory, castMembers: nextCastMembers });
  }

  function addStoryCharacterLoreEntry(
    castMemberId: string,
    entry: LoreEntry,
    { activeStory, saveActiveStory }: StoryCharacterActionDeps
  ) {
    if (!activeStory || !saveActiveStory) return;

    const nextCastMembers = activeStory.castMembers.map(member => {
      if (member.id !== castMemberId) return member;

      return {
        ...member,
        overlay: {
          ...member.overlay,
          addedLoreEntries: [...(member.overlay.addedLoreEntries || []), { ...entry, id: entry.id || createId("lore") }]
        }
      };
    });

    saveActiveStory({ ...activeStory, castMembers: nextCastMembers });
  }

  function updateStoryCharacterLoreEntry(
    castMemberId: string,
    entryId: string,
    patch: Partial<LoreEntry>,
    { activeStory, saveActiveStory }: StoryCharacterActionDeps
  ) {
    if (!activeStory || !saveActiveStory) return;

    const nextCastMembers = activeStory.castMembers.map(member => {
      if (member.id !== castMemberId) return member;

      // Check if it's an added entry
      const addedIndex = (member.overlay.addedLoreEntries || []).findIndex(e => e.id === entryId);
      if (addedIndex !== -1) {
        const nextAdded = [...member.overlay.addedLoreEntries];
        nextAdded[addedIndex] = { ...nextAdded[addedIndex], ...patch };
        return { ...member, overlay: { ...member.overlay, addedLoreEntries: nextAdded } };
      }

      // Otherwise it must be a modified base entry
      return {
        ...member,
        overlay: {
          ...member.overlay,
          modifiedLoreEntries: {
            ...member.overlay.modifiedLoreEntries,
            [entryId]: { ...(member.overlay.modifiedLoreEntries[entryId] || {}), ...patch }
          }
        }
      };
    });

    saveActiveStory({ ...activeStory, castMembers: nextCastMembers });
  }

  function removeStoryCharacterLoreEntry(
    castMemberId: string,
    entryId: string,
    { activeStory, saveActiveStory }: StoryCharacterActionDeps
  ) {
    if (!activeStory || !saveActiveStory) return;

    const nextCastMembers = activeStory.castMembers.map(member => {
      if (member.id !== castMemberId) return member;

      // If it's an added entry, just filter it out
      const nextAdded = (member.overlay.addedLoreEntries || []).filter(e => e.id !== entryId);
      if (nextAdded.length !== (member.overlay.addedLoreEntries || []).length) {
        return { ...member, overlay: { ...member.overlay, addedLoreEntries: nextAdded } };
      }

      // Otherwise add to removed list
      return {
        ...member,
        overlay: {
          ...member.overlay,
          removedLoreEntryIds: uniqueCompact([...(member.overlay.removedLoreEntryIds || []), entryId])
        }
      };
    });

    saveActiveStory({ ...activeStory, castMembers: nextCastMembers });
  }

  function resetStoryCharacterOverlay(
    castMemberId: string,
    { activeStory, saveActiveStory }: StoryCharacterActionDeps
  ) {
    if (!activeStory || !saveActiveStory) return;

    const nextCastMembers = activeStory.castMembers.map(member => {
      if (member.id !== castMemberId) return member;

      return {
        ...member,
        overlay: normalizeStoryCharacterOverlay({})
      };
    });

    saveActiveStory({ ...activeStory, castMembers: nextCastMembers });
  }

  return {
    updateStoryCharacterPatch,
    addStoryCharacterLoreEntry,
    updateStoryCharacterLoreEntry,
    removeStoryCharacterLoreEntry,
    resetStoryCharacterOverlay,
  };
}

function uniqueCompact(values: any[]): string[] {
  return [...new Set((values || []).map(String).filter(Boolean))];
}
