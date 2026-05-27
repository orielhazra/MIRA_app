import { 
  DirectorNotes, StoryJournal, CurrentContext, CastState, 
  LoreEntry, World, WorldLocation, Character, Story, ChatMessage,
  CastMemberState, RelationshipState, ObjectContext
} from "../types/index";
import { defaultWorlds } from "../constants/defaultData";
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
    for (const [charId, entries] of Object.entries(source.characterJournals)) {
      if (Array.isArray(entries)) {
        characterJournals[charId] = entries.map((entry: any, index: number) => ({
          id: String(entry.id || `${charId}-${index}`),
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
      currentObjective: String(source.scene?.currentObjective || source.scene?.objective || "")
    },
    location: {
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

export function normalizeCastState(castState: any = {}, characters: Character[] = [], legacyContext: any = {}): CastState {
  const source = castState && typeof castState === "object" ? castState : {};
  const legacy = legacyContext && typeof legacyContext === "object" ? legacyContext : {};
  const rawCharacterStates = Array.isArray(source.activeCharacters)
    ? source.activeCharacters
    : (Array.isArray(legacy.activeCharacters) ? legacy.activeCharacters : []);
  const existingStateById = new Map<string, any>(rawCharacterStates
    .map((item: any) => item && typeof item === "object" ? item : {})
    .map((row: any) => [String(row.characterId || row.id || ""), row])
    .filter(([id]) => id));

  const orderedCharacterIds = uniqueCompact([
    ...(characters || []).map((character) => character?.id),
    ...existingStateById.keys()
  ]);

  const activeCharacters: CastMemberState[] = orderedCharacterIds.map((characterId) => {
    const row = existingStateById.get(characterId) || {};
    const character: Partial<Character> = (characters || []).find((item) => item?.id === characterId) || {};
    const presence = normalizePresence(row.presence, row.present);
    return {
      characterId,
      presence,
      present: presence !== "inactive",
      outfit: String(row.outfit || character.defaultOutfit || ""),
      mood: String(row.mood || row.attitude || ""),
      condition: String(row.condition || row.physicalState || ""),
      currentGoal: String(row.currentGoal || row.goal || character.goals || ""),
      knowledge: String(row.knowledge || row.knows || row.knowsRemembers || ""),
      temporarySecret: String(row.temporarySecret || row.secret || ""),
      sceneInstruction: String(row.sceneInstruction || row.instruction || row.note || "")
    };
  }).filter((item) => item.characterId);

  const rawRelationships = Array.isArray(source.relationships)
    ? source.relationships
    : (Array.isArray(legacy.relationships) ? legacy.relationships : []);
  const existingRelationshipById = new Map<string, any>(rawRelationships
    .map((item: any) => item && typeof item === "object" ? item : {})
    .map((row: any) => [String(row.characterId || row.id || ""), row])
    .filter(([id]) => id));

  const relationships: RelationshipState[] = orderedCharacterIds.map((characterId) => {
    const row = existingRelationshipById.get(characterId) || {};
    const character: Partial<Character> = (characters || []).find((item) => item?.id === characterId) || {};
    return {
      characterId,
      relationshipToUser: String(row.relationshipToUser || row.relationship || character.relationshipToUser || ""),
      trustTensionNotes: String(row.trustTensionNotes || row.trust || row.tension || ""),
      promisesConflicts: String(row.promisesConflicts || row.promises || row.conflicts || "")
    };
  }).filter((item) => item.characterId || item.relationshipToUser.trim() || item.trustTensionNotes.trim());

  return {
    activeCharacters,
    relationships
  };
}

export function normalizeStoredLorebook(lorebook: any): LoreEntry[] {
  if (!Array.isArray(lorebook)) return [];
  return lorebook
    .map((entry: any, index: number) => {
      const source = entry && typeof entry === "object" ? entry : {};
      const enabled = source.enabled !== false;
      return {
        id: String(source.id || ""),
        name: String(source.name || `Lore ${index + 1}`),
        keywords: parseKeywords(source.keywords),
        content: String(source.content || ""),
        enabled,
        alwaysOn: enabled && source.alwaysOn === true,
        priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 0
      };
    })
    .filter((entry) => entry.name.trim() || entry.keywords.length > 0 || entry.content.trim());
}

export function normalizeWorld(world: any = {}): World {
  return {
    id: String(world.id || createId("world")),
    name: String(world.name || "Unnamed World"),
    shortDescription: String(world.shortDescription || "Roleplay world"),
    overview: String(world.overview || world.shortDescription || ""),
    description: String(world.description || ""),
    rules: String(world.rules || ""),
    locations: normalizeWorldLocations(world.locations || world.worldLocations || []),
    worldLorebook: normalizeStoredLorebook(world.worldLorebook || world.lorebook)
  };
}

export function normalizeWorldLocations(locations: any): WorldLocation[] {
  if (!Array.isArray(locations)) return [];
  return locations
    .map((location: any, index: number) => {
      const source = location && typeof location === "object" ? location : {};
      return {
        id: String(source.id || `location_${index}_${createId("loc").slice(-6)}`),
        name: String(source.name || source.title || `Location ${index + 1}`),
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

export function normalizeCharacter(character: any = {}, worlds: World[] = []): Character {
  return {
    id: String(character.id || createId("character")),
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
    lorebook: normalizeStoredLorebook(character.lorebook || character.characterLorebook)
  };
}

export function normalizeStory(story: any = {}, worlds: World[] = [], characters: Character[] = []): Story {
  const fallbackWorld = worlds?.[0] || defaultWorlds[0];
  const fallbackCharacter = characters?.[0];
  const rawCharacterIds = Array.isArray(story.characterIds)
    ? story.characterIds.map(String).filter(Boolean)
    : [];
  const characterIds = uniqueCompact(rawCharacterIds.length ? rawCharacterIds : [story.mainCharacterId || fallbackCharacter?.id || ""]);
  const mainCharacterId = String(story.mainCharacterId || characterIds[0] || fallbackCharacter?.id || "");
  const storyCharacters = (characters || []).filter((character) => characterIds.includes(character.id));

  return {
    id: String(story.id || createId("story")),
    title: String(story.title || "Untitled Story"),
    worldId: String(story.worldId || fallbackWorld?.id || "liminal-station"),
    characterIds,
    mainCharacterId,
    scenario: String(story.scenario || ""),
    greeting: String(story.greeting || "The scene begins."),
    createdAt: Number(story.createdAt || Date.now()),
    storyLorebook: normalizeStoredLorebook(story.storyLorebook || story.lorebook),
    temporaryLorebook: normalizeStoredLorebook(story.temporaryLorebook || story.tempLorebook || []),
    storyMemory: normalizeStoryMemory(story.storyMemory || story.memory || {}),
    directorNotes: normalizeDirectorNotes(story.directorNotes),
    currentContext: normalizeCurrentContext(story.currentContext),
    castState: normalizeCastState(story.castState, storyCharacters, story.currentContext)
  };
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
