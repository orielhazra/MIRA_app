import { Character, StoryCastMember, StoryCharacterOverlay, LoreEntry, Story } from "../types/index";
import { createEmptyCharacterOverlay } from "../constants/defaultData";

/**
 * Creates an effective character by applying a story-specific overlay to a base character template.
 */
export function applyCharacterOverlay(base: Character, overlay: StoryCharacterOverlay, castMemberId?: string): Character {
  const patch = overlay.identityPatch;
  
  // Resolve core fields
  const effective: Character = {
    ...base,
    id: castMemberId || base.id, // Prefer story-local cast member ID for runtime identity
    name: patch.name ?? base.name,
    shortDescription: patch.shortDescription ?? base.shortDescription,
    race: patch.race ?? base.race,
    role: patch.role ?? base.role,
    aliases: patch.aliases ?? base.aliases,
    promptKeywords: patch.promptKeywords ?? base.promptKeywords,
    profileSummary: patch.profileSummary ?? base.profileSummary,
    defaultOutfit: patch.defaultOutfit ?? base.defaultOutfit,
    description: patch.description ?? base.description,
    personality: patch.personality ?? base.personality,
    appearance: patch.appearance ?? base.appearance,
    backstory: patch.backstory ?? base.backstory,
    speakingStyle: patch.speakingStyle ?? base.speakingStyle,
    relationshipToUser: patch.relationshipToUser ?? base.relationshipToUser,
    goals: patch.goals ?? base.goals,
    characterRules: patch.characterRules ?? base.characterRules,
    promptPinned: patch.promptPinned ?? base.promptPinned,
  };

  // Resolve lorebook
  const baseLore = base.lorebook || [];
  const modifiedLore = overlay.modifiedLoreEntries || {};
  const addedLore = overlay.addedLoreEntries || [];
  const removedIds = new Set(overlay.removedLoreEntryIds || []);

  const effectiveLore: LoreEntry[] = baseLore
    .filter(entry => entry.id && !removedIds.has(entry.id))
    .map(entry => {
      if (entry.id && modifiedLore[entry.id]) {
        return { ...entry, ...modifiedLore[entry.id] };
      }
      return entry;
    });

  effective.lorebook = [...effectiveLore, ...addedLore];

  return effective;
}

/**
 * Resolves an effective character for a specific cast member in a story.
 */
export function resolveEffectiveStoryCharacter(
  castMember: StoryCastMember,
  characters: Character[]
): Character | null {
  const base = characters.find(c => c.id === castMember.templateCharacterId);
  if (!base) return null;
  
  return applyCharacterOverlay(base, castMember.overlay, castMember.id);
}

/**
 * Resolves all effective characters for a story's cast.
 */
export function resolveEffectiveStoryCharacters(
  story: Story,
  characters: Character[]
): Character[] {
  return (story.castMembers || [])
    .map(member => resolveEffectiveStoryCharacter(member, characters))
    .filter((c): c is Character => c !== null);
}

/**
 * Returns a list of the latest versions of each character template.
 */
export function getLatestTemplateCharacters(characters: Character[]): Character[] {
  const latestMap = new Map<string, Character>();

  for (const char of characters) {
    const key = char.templateKey || char.id;
    const existing = latestMap.get(key);
    
    if (!existing || (char.templateVersion || 1) > (existing.templateVersion || 1)) {
      latestMap.set(key, char);
    }
  }

  return Array.from(latestMap.values());
}

/**
 * Finds a specific template by ID.
 */
export function getTemplateCharacterById(
  templateCharacterId: string,
  characters: Character[]
): Character | undefined {
  return characters.find(c => c.id === templateCharacterId);
}

/**
 * Finds the latest template version for a specific key.
 */
export function getLatestTemplateCharacterByKey(
  templateKey: string,
  characters: Character[]
): Character | undefined {
  const versions = characters.filter(c => c.templateKey === templateKey);
  if (versions.length === 0) return undefined;
  
  return versions.reduce((prev, curr) => 
    (curr.templateVersion || 1) > (prev.templateVersion || 1) ? curr : prev
  );
}

/**
 * Finds a cast member by its story-local instance ID.
 */
export function getStoryCastMemberById(
  story: Story,
  castMemberId: string
): StoryCastMember | undefined {
  return story.castMembers.find(m => m.id === castMemberId);
}
