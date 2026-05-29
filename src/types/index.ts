// Core TypeScript Interfaces and Types for M.I.R.A.

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  alternatives?: string[];
  selectedIndex?: number;
}

export interface LoreEntry {
  id?: string;
  name: string;
  keywords: string[];
  content: string;
  enabled: boolean;
  alwaysOn: boolean;
  priority?: number;
  triggeredAt?: number;
  source?: string;
  sourceId?: string;
  sourceKey?: string;
  originalIndex?: number;
}

export interface WorldLocation {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  mood?: string;
  visibleExits?: string;
  hazards?: string;
  availableLocations?: string;
  connectedTo?: string;
  exits?: string;
  keywords?: string[];
}

export interface World {
  id: string;
  templateKey?: string;
  templateVersion?: number;
  name: string;
  overview?: string;
  shortDescription?: string;
  description?: string;
  rules?: string;
  locations?: WorldLocation[];
  worldLorebook?: LoreEntry[];
  worldLocations?: any;
  startingScenario?: string;
  lorebook?: any;
  createdAt?: number;
}

export interface StoryWorldOverlay {
  worldPatch: {
    name?: string;
    overview?: string;
    shortDescription?: string;
    description?: string;
    rules?: string;
  };
  modifiedLocations: Record<string, Partial<WorldLocation>>;
  addedLocations: WorldLocation[];
  removedLocationIds: string[];
  modifiedLoreEntries: Record<string, Partial<LoreEntry>>;
  addedLoreEntries: LoreEntry[];
  removedLoreEntryIds: string[];
}

export interface Character {
  id: string;
  name: string;
  shortDescription?: string;
  race?: string;
  role?: string;
  aliases?: string[];
  promptKeywords?: string[];
  profileSummary?: string;
  defaultOutfit?: string;
  description?: string;
  personality?: string;
  appearance?: string;
  backstory?: string;
  speakingStyle?: string;
  relationshipToUser?: string;
  goals?: string;
  characterRules?: string;
  promptPinned?: boolean;
  lorebook?: LoreEntry[];
  characterLorebook?: any;
  createdAt?: number;
}

export interface CastMemberState {
  characterId: string;
  presence: "active" | "nearby" | "inactive";
  present?: boolean;
  outfit?: string;
  mood?: string;
  condition?: string;
  currentGoal?: string;
  knowledge?: string;
  temporarySecret?: string;
  sceneInstruction?: string;
}

export interface RelationshipState {
  characterId: string;
  relationshipToUser?: string;
  trustTensionNotes?: string;
  promisesConflicts?: string;
}

export interface CastState {
  activeCharacters: CastMemberState[];
  relationships: RelationshipState[];
}

export interface JournalEntry {
  id: string;
  content: string;
  active: boolean;
  createdAt: number;
}

export interface TaskItem {
  id: string;
  content: string;
  active: boolean;
  completed: boolean;
  createdAt: number;
}

export interface StoryJournal {
  summary: string;
  generalJournal: JournalEntry[];
  characterJournals: Record<string, JournalEntry[]>;
  tasks: TaskItem[];
}

export interface SceneFacts {
  timeOfDay?: string;
  atmosphere?: string;
  currentConflict?: string;
  currentObjective?: string;
}

export interface LocationContext {
  locationId?: string;
  id?: string;
  name?: string;
  description?: string;
  visibleExits?: string;
  availableLocations?: string;
  hazards?: string;
}

export interface ObjectContext {
  id: string;
  name: string;
  locationOrHolder?: string;
  visibleState?: string;
  hiddenDetail?: string;
  status: "active" | "hidden" | "visible" | "inventory";
}

export interface RecentFactContext {
  importantDiscoveries?: string;
  secretsRevealed?: string;
  openQuestions?: string;
}

export interface CurrentContext {
  scene: SceneFacts;
  location: LocationContext;
  objects: ObjectContext[];
  recentFacts: RecentFactContext;
  activeCharacters?: CastMemberState[];
}

export interface DirectorNotes {
  timeOfDay?: string;
  currentLocation?: string;
  sceneMood?: string;
  characterMotivation?: string;
  userPlan?: string;
  currentConflict?: string;
  nextStoryBeat?: string;
  avoid?: string;
  customNotes?: string;
}

// Lightweight metadata for listing stories without loading full data
export interface StoryMeta {
  id: string;
  title: string;
  templateWorldId: string;
  characterIds: string[];
  characterCount: number;
  createdAt?: number;
  lastPlayedAt?: number;
}

// Full story data (loaded only when active)
export interface Story {
  id: string;
  title: string;
  templateWorldId: string;
  templateWorldKey?: string;
  templateWorldVersion?: number;
  worldOverlay: StoryWorldOverlay;
  characterIds: string[];
  scenario?: string;
  greeting?: string;
  storyLorebook?: LoreEntry[];
  temporaryLorebook?: LoreEntry[];
  storyMemory: StoryJournal;
  currentContext: CurrentContext;
  castState: CastState;
  directorNotes?: DirectorNotes;
  createdAt?: number;
  lastPlayedAt?: number;
}
