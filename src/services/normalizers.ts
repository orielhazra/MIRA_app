import { 
  DirectorNotes, StoryJournal, CurrentContext, CastState, 
  LoreEntry, World, WorldLocation, StoryWorldOverlay, Character, Story, ChatMessage,
  CastMemberState, RelationshipState, ObjectContext, StoryCharacterOverlay, StoryCastMember,
  UserProfile, Persona
} from "../types/index";
import { defaultWorlds, createEmptyCharacterOverlay } from "../constants/defaultData";
import { clampNumber, createId, parseKeywords } from "../utils/helpers";

// Safe fallback defaults for normalization
export const DEFAULT_DIRECTOR_NOTES: DirectorNotes = {
  timeOfDay: "",
  currentLocation: "",
  sceneMood: "",
  characterMotivation: "",
  userPlan: "",
  currentConflict: "",
  nextStoryBeat: "",
  avoid: "",
  customNotes: ""
};

export const DEFAULT_STORY_MEMORY: StoryJournal = {
  summary: "",
  generalJournal: [],
  characterJournals: {},
  tasks: []
};

export function normalizeDirectorNotes(notes: any): DirectorNotes {
  const source = notes && typeof notes === "object" ? notes : {};
  return {
    timeOfDay: String(source.timeOfDay || DEFAULT_DIRECTOR_NOTES.timeOfDay || ""),
    currentLocation: String(source.currentLocation || DEFAULT_DIRECTOR_NOTES.currentLocation || ""),
    sceneMood: String(source.sceneMood || DEFAULT_DIRECTOR_NOTES.sceneMood || ""),
    characterMotivation: String(source.characterMotivation || DEFAULT_DIRECTOR_NOTES.characterMotivation || ""),
    userPlan: String(source.userPlan || DEFAULT_DIRECTOR_NOTES.userPlan || ""),
    currentConflict: String(source.currentConflict || DEFAULT_DIRECTOR_NOTES.currentConflict || ""),
    nextStoryBeat: String(source.nextStoryBeat || DEFAULT_DIRECTOR_NOTES.nextStoryBeat || ""),
    avoid: String(source.avoid || DEFAULT_DIRECTOR_NOTES.avoid || ""),
    customNotes: String(source.customNotes || DEFAULT_DIRECTOR_NOTES.customNotes || "")
  };
}

export function normalizeStoryMemory(memory: any): StoryJournal {
  const source = memory && typeof memory === "object" ? memory : {};
  
  const summary = String(source.summary || source.coreSummary || DEFAULT_STORY_MEMORY.summary || "");
  
  const generalJournal = Array.isArray(source.generalJournal)
    ? source.generalJournal.map((entry: any, index: number) => ({
        id: String(entry.id || `general-${index}`),
        content: String(entry.content || ""),
        active: entry.active !== false,
        createdAt: Number(entry.createdAt || Date.now())
      }))
    : [];
  
  const characterJournals: Record<string, any[]> = {};
  if (source.characterJournals && typeof source.characterJournals === "object") {
    for (const [castMemberId, entries] of Object.entries(source.characterJournals)) {
      if (Array.isArray(entries)) {
        characterJournals[castMemberId] = entries.map((entry: any, index: number) => ({
          id: String(entry.id || `${castMemberId}-${index}`),
          content: String(entry.content || ""),
          active: entry.active !== false,
          createdAt: Number(entry.createdAt || Date.now())
        }));
      }
    }
  }
  
  const tasks = Array.isArray(source.tasks)
    ? source.tasks.map((task: any, index: number) => ({
        id: String(task.id || `task-${index}`),
        content: String(task.content || ""),
        active: task.active !== false,
        completed: task.completed === true,
        createdAt: Number(task.createdAt || Date.now())
      }))
    : [];
  
  return {
    summary,
    generalJournal,
    characterJournals,
    tasks
  };
}

export const DEFAULT_CURRENT_CONTEXT: CurrentContext = {
  scene: {
    timeOfDay: "",
    atmosphere: "",
    currentConflict: "",
    currentObjective: ""
  },
  location: {
    locationId: "",
    name: "",
    description: "",
    visibleExits: "",
    hazards: "",
    availableLocations: ""
  },
  objects: [],
  recentFacts: {
    importantDiscoveries: "",
    secretsRevealed: "",
    openQuestions: ""
  }
};

export const DEFAULT_CAST_STATE: CastState = {
  activeCharacters: [],
  relationships: []
};

export function normalizeCurrentContext(context: any = {}): CurrentContext {
  const source = context && typeof context === "object" ? context : {};

  const objects: ObjectContext[] = Array.isArray(source.objects) ? source.objects.map((item: any) => {
    const row = item && typeof item === "object" ? item : {};
    return {
      id: String(row.id || createId("object")),
      name: String(row.name || ""),
      locationOrHolder: String(row.locationOrHolder || row.location || row.holder || ""),
      visibleState: String(row.visibleState || row.state || ""),
      hiddenDetail: String(row.hiddenDetail || ""),
      status: (row.status || "active") as any
    };
  }).filter((item: any) => item.name.trim() || item.visibleState.trim() || item.status.trim()) : [];

  return {
    scene: {
      timeOfDay: String(source.scene?.timeOfDay || ""),
      atmosphere: String(source.scene?.atmosphere || ""),
      currentConflict: String(source.scene?.currentConflict || ""),
      currentObjective: String(source.scene?.currentObjective || String(source.scene?.objective || ""))
    },
    location: {
      locationId: String(source.location?.locationId || source.location?.id || ""),
      name: String(source.location?.name || ""),
      description: String(source.location?.description || ""),
      visibleExits: String(source.location?.visibleExits || source.location?.exits || ""),
      hazards: String(source.location?.hazards || ""),
      availableLocations: String(source.location?.availableLocations || source.location?.nearbyLocations || "")
    },
    objects,
    recentFacts: {
      importantDiscoveries: String(source.recentFacts?.importantDiscoveries || ""),
      secretsRevealed: String(source.recentFacts?.secretsRevealed || ""),
      openQuestions: String(source.recentFacts?.openQuestions || "")
    }
  };
}

export function normalizeCastState(castState: any = {}, castMembers: StoryCastMember[] = [], characters: Character[] = [], legacyContext: any = {}): CastState {
  const source = castState && typeof castState === "object" ? castState : {};
  const legacy = legacyContext && typeof legacyContext === "object" ? legacyContext : {};
  const rawCharacterStates = Array.isArray(source.activeCharacters)
    ? source.activeCharacters
    : (Array.isArray(legacy.activeCharacters) ? legacy.activeCharacters : []);
  
  // existingStateById should now handle castMemberId primary, or legacy characterId
  const existingStateById = new Map<string, any>(rawCharacterStates
    .map((item: any) => item && typeof item === "object" ? item : {})
    .map((row: any) => [String(row.castMemberId || row.characterId || row.id || ""), row])
    .filter(([id]) => id));

  const orderedCastMemberIds = uniqueCompact([
    ...(castMembers || []).map((m) => m.id),
    ...existingStateById.keys()
  ]);

  const activeCharacters: CastMemberState[] = orderedCastMemberIds.map((castMemberId) => {
    const row = existingStateById.get(castMemberId) || {};
    const castMember = (castMembers || []).find((m) => m.id === castMemberId);
    const templateId = castMember?.templateCharacterId || castMemberId;
    const character: Partial<Character> = (characters || []).find((item) => item?.id === templateId) || {};
    
    const presence = normalizePresence(row.presence, row.present);
    return {
      castMemberId,
      presence,
      present: presence !== "inactive",
      locationId: String(row.locationId || row.location || "with_user"),
      outfit: String(row.outfit || character.defaultOutfit || ""),
      mood: String(row.mood || row.attitude || ""),
      condition: String(row.condition || row.physicalState || ""),
      currentGoal: String(row.currentGoal || row.goal || character.goals || ""),
      knowledge: String(row.knowledge || row.knows || row.knowsRemembers || ""),
      temporarySecret: String(row.temporarySecret || row.secret || ""),
      sceneInstruction: String(row.sceneInstruction || row.instruction || row.note || "")
    };
  }).filter((item) => item.castMemberId);

  const rawRelationships = Array.isArray(source.relationships)
    ? source.relationships
    : (Array.isArray(legacy.relationships) ? legacy.relationships : []);
  const existingRelationshipById = new Map<string, any>(rawRelationships
    .map((item: any) => item && typeof item === "object" ? item : {})
    .map((row: any) => [String(row.castMemberId || row.characterId || row.id || ""), row])
    .filter(([id]) => id));

  const relationships: RelationshipState[] = orderedCastMemberIds.map((castMemberId) => {
    const row = existingRelationshipById.get(castMemberId) || {};
    const castMember = (castMembers || []).find((m) => m.id === castMemberId);
    const templateId = castMember?.templateCharacterId || castMemberId;
    const character: Partial<Character> = (characters || []).find((item) => item?.id === templateId) || {};
    
    return {
      castMemberId,
      relationshipToUser: String(row.relationshipToUser || row.relationship || character.relationshipToUser || ""),
      trustTensionNotes: String(row.trustTensionNotes || row.trust || row.tension || ""),
      promisesConflicts: String(row.promisesConflicts || row.promises || row.conflicts || "")
    };
  }).filter((item) => item.castMemberId || item.relationshipToUser.trim() || item.trustTensionNotes.trim());

  return {
    activeCharacters,
    relationships
  };
}

export function normalizeStoredLorebook(lorebook: any): LoreEntry[] {
  if (!Array.isArray(lorebook)) return [];
  const seenIds = new Map<string, number>();
  return lorebook
    .map((entry: any, index: number) => {
      const source = entry && typeof entry === "object" ? entry : {};
      const enabled = source.enabled !== false;
      const name = String(source.name || `Lore ${index + 1}`);
      const keywords = parseKeywords(source.keywords);
      return {
        id: makeUniqueStableId(
          String(source.id || buildStableEntityId("lore", name || keywords[0] || `lore-${index + 1}`)),
          seenIds
        ),
        name,
        keywords,
        content: String(source.content || ""),
        enabled,
        alwaysOn: enabled && source.alwaysOn === true,
        priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 0
      };
    })
    .filter((entry) => entry.name.trim() || entry.keywords.length > 0 || entry.content.trim());
}

export function normalizeWorld(world: any = {}): World {
  const id = String(world.id || createId("world"));
  return {
    id,
    templateKey: String(world.templateKey || id),
    templateVersion: Number(world.templateVersion || 1),
    name: String(world.name || "Unnamed World"),
    shortDescription: String(world.shortDescription || "Roleplay world"),
    overview: String(world.overview || world.shortDescription || ""),
    description: String(world.description || ""),
    rules: String(world.rules || ""),
    locations: normalizeWorldLocations(world.locations || world.worldLocations || []),
    worldLorebook: normalizeStoredLorebook(world.worldLorebook || world.lorebook),
    createdAt: Number.isFinite(Number(world.createdAt)) ? Number(world.createdAt) : undefined,
  };
}

export function normalizeWorldLocations(locations: any): WorldLocation[] {
  if (!Array.isArray(locations)) return [];
  const seenIds = new Map<string, number>();
  return locations
    .map((location: any, index: number) => {
      const source = location && typeof location === "object" ? location : {};
      const name = String(source.name || source.title || `Location ${index + 1}`);
      return {
        id: makeUniqueStableId(
          String(source.id || buildStableEntityId("location", name || `location-${index + 1}`)),
          seenIds
        ),
        name,
        summary: String(source.summary || source.shortDescription || ""),
        description: String(source.description || ""),
        mood: String(source.mood || source.atmosphere || ""),
        visibleExits: String(source.visibleExits || source.exits || ""),
        hazards: String(source.hazards || ""),
        connectedTo: String(source.connectedTo || source.connectedLocations || ""),
        keywords: parseKeywords(source.keywords || source.promptKeywords)
      };
    })
    .filter((location) => location.name.trim() || location.description.trim());
}

export function normalizeCharacter(character: any = {}): Character {
  const id = String(character.id || createId("character"));
  return {
    id,
    templateKey: String(character.templateKey || id),
    templateVersion: Number(character.templateVersion || 1),
    name: String(character.name || "Unnamed Character"),
    shortDescription: String(character.shortDescription || "Roleplay character"),
    race: String(character.race || character.species || character.type || ""),
    role: String(character.role || character.storyRole || ""),
    aliases: parseKeywords(character.aliases),
    promptKeywords: parseKeywords(character.promptKeywords || character.keywords),
    profileSummary: String(character.profileSummary || character.promptSummary || character.shortDescription || ""),
    defaultOutfit: String(character.defaultOutfit || character.outfit || ""),
    promptPinned: character.promptPinned === true,
    description: String(character.description || ""),
    personality: String(character.personality || ""),
    appearance: String(character.appearance || ""),
    backstory: String(character.backstory || ""),
    speakingStyle: String(character.speakingStyle || ""),
    relationshipToUser: String(character.relationshipToUser || ""),
    goals: String(character.goals || ""),
    characterRules: String(character.characterRules || ""),
    lorebook: normalizeStoredLorebook(character.lorebook || character.characterLorebook),
    createdAt: Number.isFinite(Number(character.createdAt)) ? Number(character.createdAt) : undefined,
  };
}

export function normalizeUserProfile(profile: any): UserProfile {
  const source = profile || {};
  return {
    name: String(source.name || "You"),
    description: String(source.description || ""),
    appearance: String(source.appearance || ""),
    backstory: String(source.backstory || ""),
    mood: String(source.mood || ""),
    condition: String(source.condition || ""),
    outfit: String(source.outfit || ""),
    locationId: String(source.locationId || "with_user")
  };
}

export function normalizePersona(persona: any): Persona {
  const source = persona || {};
  return {
    id: String(source.id || createId("persona")),
    name: String(source.name || "Unnamed Persona"),
    description: String(source.description || ""),
    appearance: String(source.appearance || ""),
    backstory: String(source.backstory || ""),
    createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now()
  };
}

export function normalizeStory(story: any = {}, worlds: World[] = [], characters: Character[] = []): Story {
  const fallbackWorld = normalizeWorld(worlds?.[0] || defaultWorlds[0]);
  
  const templateWorldId = String(story.templateWorldId || fallbackWorld?.id || "liminal-station");
  const templateWorld = normalizeWorld((worlds || []).find((world) => world.id === templateWorldId) || fallbackWorld);

  // Handle conversion from legacy characterIds to castMembers
  let castMembers: StoryCastMember[] = [];
  if (Array.isArray(story.castMembers)) {
    castMembers = story.castMembers.map(normalizeStoryCastMember);
  } else if (Array.isArray(story.characterIds)) {
    castMembers = story.characterIds.map((charId: string) => {
      const template = characters.find(c => c.id === charId);
      return {
        id: createId("cast"),
        templateCharacterId: charId,
        templateCharacterKey: template?.templateKey || charId,
        templateCharacterVersion: template?.templateVersion || 1,
        overlay: createEmptyCharacterOverlay()
      };
    });
  }

  return {
    id: String(story.id || createId("story")),
    title: String(story.title || "Untitled Story"),
    templateWorldId,
    templateWorldKey: String(story.templateWorldKey || templateWorld.templateKey || templateWorldId),
    templateWorldVersion: Number(story.templateWorldVersion || templateWorld.templateVersion || 1),
    worldOverlay: normalizeStoryWorldOverlay(story.worldOverlay),
    castMembers,
    userProfile: normalizeUserProfile(story.userProfile),
    scenario: String(story.scenario || ""),
    greeting: String(story.greeting || "The scene begins."),
    createdAt: Number(story.createdAt || Date.now()),
    lastPlayedAt: story.lastPlayedAt ? Number(story.lastPlayedAt) : undefined,
    storyLorebook: normalizeStoredLorebook(story.storyLorebook || story.lorebook),
    temporaryLorebook: normalizeStoredLorebook(story.temporaryLorebook || story.tempLorebook || []),
    storyMemory: normalizeStoryMemory(story.storyMemory || story.memory || {}),
    directorNotes: normalizeDirectorNotes(story.directorNotes),
    currentContext: normalizeCurrentContext(story.currentContext),
    castState: normalizeCastState(story.castState, castMembers, characters, story.currentContext)
  };
}

export function normalizeStoryWorldOverlay(overlay: any = {}): StoryWorldOverlay {
  const source = overlay && typeof overlay === "object" ? overlay : {};
  return {
    worldPatch: normalizePartialRecord(source.worldPatch, ["name", "overview", "shortDescription", "description", "rules"]),
    modifiedLocations: source.modifiedLocations && typeof source.modifiedLocations === "object"
      ? Object.fromEntries(Object.entries(source.modifiedLocations).map(([id, patch]) => [String(id), normalizePartialRecord(patch)]))
      : {},
    addedLocations: normalizeWorldLocations(source.addedLocations || []),
    removedLocationIds: Array.isArray(source.removedLocationIds) ? source.removedLocationIds.map(String).filter(Boolean) : [],
    modifiedLoreEntries: source.modifiedLoreEntries && typeof source.modifiedLoreEntries === "object"
      ? Object.fromEntries(Object.entries(source.modifiedLoreEntries).map(([id, patch]) => [String(id), normalizePartialRecord(patch)]))
      : {},
    addedLoreEntries: normalizeStoredLorebook(source.addedLoreEntries || []),
    removedLoreEntryIds: Array.isArray(source.removedLoreEntryIds) ? source.removedLoreEntryIds.map(String).filter(Boolean) : [],
  };
}

export function normalizeStoryCharacterOverlay(overlay: any = {}): StoryCharacterOverlay {
  const source = overlay && typeof overlay === "object" ? overlay : {};
  const identityFields = [
    "name", "shortDescription", "race", "role", "aliases", "promptKeywords", 
    "profileSummary", "defaultOutfit", "description", "personality", 
    "appearance", "backstory", "speakingStyle", "relationshipToUser", 
    "goals", "characterRules", "promptPinned"
  ];
  return {
    identityPatch: normalizePartialRecord(source.identityPatch, identityFields),
    modifiedLoreEntries: source.modifiedLoreEntries && typeof source.modifiedLoreEntries === "object"
      ? Object.fromEntries(Object.entries(source.modifiedLoreEntries).map(([id, patch]) => [String(id), normalizePartialRecord(patch)]))
      : {},
    addedLoreEntries: normalizeStoredLorebook(source.addedLoreEntries || []),
    removedLoreEntryIds: Array.isArray(source.removedLoreEntryIds) ? source.removedLoreEntryIds.map(String).filter(Boolean) : [],
  };
}

export function normalizeStoryCastMember(castMember: any = {}): StoryCastMember {
  const source = castMember && typeof castMember === "object" ? castMember : {};
  return {
    id: String(source.id || createId("cast")),
    templateCharacterId: String(source.templateCharacterId || ""),
    templateCharacterKey: String(source.templateCharacterKey || ""),
    templateCharacterVersion: Number(source.templateCharacterVersion || 1),
    overlay: normalizeStoryCharacterOverlay(source.overlay)
  };
}

function normalizePartialRecord(value: any, allowedFields?: string[]): Record<string, any> {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value)
    .filter(([key]) => !allowedFields || allowedFields.includes(key))
    .map(([key, fieldValue]) => [key, Array.isArray(fieldValue) ? fieldValue.map(String) : (typeof fieldValue === "string" ? String(fieldValue) : fieldValue)])
    .filter(([, fieldValue]) => fieldValue !== undefined);
  return Object.fromEntries(entries);
}


function buildStableEntityId(prefix: string, seed: string): string {
  const normalizedSeed = String(seed || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
  return `${prefix}_${normalizedSeed || prefix}`;
}

function makeUniqueStableId(baseId: string, seenIds: Map<string, number>): string {
  const normalizedBaseId = String(baseId || "").trim() || "entry";
  const count = seenIds.get(normalizedBaseId) || 0;
  seenIds.set(normalizedBaseId, count + 1);
  return count === 0 ? normalizedBaseId : `${normalizedBaseId}_${count + 1}`;
}

function normalizePresence(value: any, legacyPresent: boolean = true): "active" | "nearby" | "inactive" {
  const raw = String(value || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw as any;
  if (raw === "background" || raw === "present") return "nearby";
  if (raw === "off-scene" || raw === "offscene" || raw === "not present") return "inactive";
  return legacyPresent === false ? "inactive" : "active";
}

function uniqueCompact(values: any[]): string[] {
  return [...new Set(values.map(String).filter(Boolean))];
}

export function normalizeChatMessage(message: any): ChatMessage {
  const normalized: ChatMessage = {
    role: message?.role === "user" ? "user" : "assistant",
    content: String(message?.content || "")
  };
  if (Array.isArray(message?.alternatives)) {
    normalized.alternatives = message.alternatives.map(String);
    normalized.selectedIndex = clampNumber(
      Number(message.selectedIndex || 0),
      0,
      Math.max(0, normalized.alternatives.length - 1)
    );
  }
  return normalized;
}

export function createBlankLoreEntry(): LoreEntry {
  return {
    id: "",
    name: "New Lore Entry",
    keywords: [],
    content: "",
    enabled: true,
    alwaysOn: false,
    priority: 0
  };
}
