// Pure helper functions extracted from App.tsx.
// None of these reference React state directly.

import { 
  Story, World, Character, ChatMessage, CurrentContext, CastState, 
  DirectorNotes, StoryJournal, CastMemberState, RelationshipState, ObjectContext,
  StoryCastMember
} from "../types/index";
import { defaultWorlds, defaultCharacters, defaultStories, createEmptyCharacterOverlay } from "../constants/defaultData";
import { 
  normalizeCastState, normalizeCharacter, normalizeStory, normalizeWorld, 
  normalizeDirectorNotes, normalizeCurrentContext, normalizeStoryMemory, normalizeChatMessage 
} from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { repository } from "../services/repository";
import { normalizeMatchText } from "./textUtils";
import { storyToMeta } from "../services/storyMeta";
import { cloneJson, createId } from "./helpers";
import { getMessageDisplayText, isAssistantMessageWithOptions } from "./chatMessageUtils";
import { resolveEffectiveStoryCharacters } from "../services/storyCharacters";
import { normalizePresence } from "./castUtils";

// Re-export under legacy name for backward compatibility
export const normalizeCastPresence = normalizePresence;

export function getAutoPresence(charLocId: string | undefined, sceneLocId: string | undefined): "active" | "nearby" | "inactive" {
  if (charLocId === "with_user") return "active";
  if (charLocId === "unknown") return "inactive";
  if (sceneLocId && charLocId === sceneLocId) return "nearby";
  return "inactive";
}

export function syncDirectorNotesFromContext(notes: DirectorNotes | undefined, context: CurrentContext): DirectorNotes {
  const normalizedNotes = normalizeDirectorNotes(notes);
  const normalizedContext = normalizeCurrentContext(context);

  return normalizeDirectorNotes({
    ...normalizedNotes,
    timeOfDay: normalizedContext.scene.timeOfDay || normalizedNotes.timeOfDay,
    currentLocation: normalizedContext.location.name || normalizedNotes.currentLocation,
    sceneMood: normalizedContext.scene.atmosphere || normalizedNotes.sceneMood,
    currentConflict: normalizedContext.scene.currentConflict || normalizedNotes.currentConflict,
    nextStoryBeat: normalizedContext.scene.currentObjective || normalizedNotes.nextStoryBeat,
  });
}

export function syncCurrentContextFromDirectorNotes(context: CurrentContext, notes: DirectorNotes): CurrentContext {
  const normalizedContext = normalizeCurrentContext(context);
  const normalizedNotes = normalizeDirectorNotes(notes);
  return normalizeCurrentContext({
    ...normalizedContext,
    scene: {
      ...normalizedContext.scene,
      timeOfDay: normalizedNotes.timeOfDay || normalizedContext.scene.timeOfDay,
      atmosphere: normalizedNotes.sceneMood || normalizedContext.scene.atmosphere,
      currentConflict: normalizedNotes.currentConflict || normalizedContext.scene.currentConflict,
      currentObjective: normalizedContext.scene.currentObjective || normalizedNotes.nextStoryBeat
    },
    location: {
      ...normalizedContext.location,
      name: normalizedNotes.currentLocation || normalizedContext.location.name
    }
  });
}

export function createInitialCurrentContext(world: World | null, effectiveCharacters: Character[] = []): CurrentContext {
  return normalizeCurrentContext({
    scene: {
      timeOfDay: "",
      atmosphere: "",
      currentConflict: "",
      currentObjective: ""
    },
    location: {
      locationId: world?.locations?.[0]?.id || "",
      name: world?.locations?.[0]?.name || world?.name || "",
      description: world?.locations?.[0]?.description || world?.startingScenario || world?.description || "",
      visibleExits: world?.locations?.[0]?.visibleExits || "",
      hazards: world?.locations?.[0]?.hazards || "",
      availableLocations: (world?.locations || []).slice(1).map((location) => `${location.name}: ${location.summary || location.description || ""}`.trim()).join("\n")
    },
    objects: [],
    recentFacts: {
      importantDiscoveries: "",
      secretsRevealed: "",
      openQuestions: ""
    }
  });
}

export function createInitialCastState(castMembers: StoryCastMember[], characters: Character[]): CastState {
  const castStates: CastMemberState[] = castMembers.map(member => {
    const template = characters.find(c => c.id === member.templateCharacterId);
    return {
      castMemberId: member.id,
      presence: "active",
      present: true,
      locationId: "with_user",
      outfit: template?.defaultOutfit || "",
      mood: "",
      condition: "",
      currentGoal: template?.goals || "",
      knowledge: "",
      temporarySecret: "",
      sceneInstruction: ""
    };
  });

  const relationshipStates: RelationshipState[] = castMembers.map(member => {
    const template = characters.find(c => c.id === member.templateCharacterId);
    return {
      castMemberId: member.id,
      relationshipToUser: template?.relationshipToUser || "",
      trustTensionNotes: "",
      promisesConflicts: ""
    };
  });

  return {
    activeCharacters: castStates,
    relationships: relationshipStates
  };
}

export function applyUpdatesToCurrentContext(context: CurrentContext, updates: any[], world: World | null = null): CurrentContext {
  const next = normalizeCurrentContext(context);
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const target = String(update.target || "").trim();
    const to = String(update.to || "").trim();
    const title = String(update.title || "Suggested update").trim();
    const details = String(update.details || "").trim();
    const summary = formatUpdateSummary(update);
    if (category === "location") {
      const nextLocationLabel = to || target || next.location.name || "";
      const matchedLocation = resolveWorldLocationFromText(world, nextLocationLabel);
      if (matchedLocation) {
        next.location.locationId = matchedLocation.id || "";
        next.location.name = matchedLocation.name || nextLocationLabel;
        next.location.description = details ? appendLine(matchedLocation.description || "", details) : (matchedLocation.description || next.location.description);
        next.location.visibleExits = matchedLocation.visibleExits || next.location.visibleExits;
        next.location.hazards = matchedLocation.hazards || next.location.hazards;
      } else if (nextLocationLabel) {
        next.location.locationId = "";
        next.location.name = nextLocationLabel;
        if (details) next.location.description = appendLine(next.location.description, details);
      }
      appendRecentFact(next, summary);
      continue;
    }
    if (category === "scene") {
      if (to) next.scene.currentObjective = to;
      if (details) next.scene.currentConflict = appendLine(next.scene.currentConflict, details);
      appendRecentFact(next, summary);
      continue;
    }
    if (category === "character" || category === "outfit" || category === "relationship") continue;
    if (category === "object" || category === "inventory") {
      next.objects.push({
        id: createId("object"),
        name: target || title,
        locationOrHolder: category === "inventory" ? (target || "Inventory") : (next.location.name || world?.name || "Current scene"),
        visibleState: to || details || "Noted",
        hiddenDetail: "",
        status: category === "inventory" ? "inventory" : "active"
      });
      appendRecentFact(next, summary);
      continue;
    }
    if (category === "memory") { appendRecentFact(next, summary); continue; }
    appendRecentFact(next, summary);
  }
  return normalizeCurrentContext(next);
}

export function applyUpdatesToStoryMemory(storyMemory: StoryJournal, updates: any[] = [], story: Story | null = null, effectiveCharacters: Character[] = []): StoryJournal {
  const next = normalizeStoryMemory(storyMemory);
  const characterByName = new Map<string, Character>(effectiveCharacters.map(c => [c.name.toLowerCase(), c]));
  
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const summary = formatUpdateSummary(update);
    if (category === "memory") {
      next.generalJournal = [
        ...next.generalJournal,
        { id: `general-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`, content: summary, active: true, createdAt: Date.now() }
      ];
    }
    if ((category === "relationship" || category === "character") && story) {
      const target = String(update.target || "").trim();
      const titleText = `${update.title || ""} ${update.details || ""}`.toLowerCase();
      if (target) {
        const char = findCharacterFromText(target, characterByName, effectiveCharacters);
        // Map character back to castMemberId
        const castMember = story.castMembers.find(m => m.templateCharacterId === char?.id || m.id === target);
        const castMemberId = castMember?.id || target.toLowerCase().replace(/\s+/g, "-");
        
        if (!next.characterJournals[castMemberId]) next.characterJournals[castMemberId] = [];
        if (titleText.includes("learn") || titleText.includes("know") || titleText.includes("remember") || titleText.includes("trust") || titleText.includes("suspect")) {
          next.characterJournals[castMemberId].push({
            id: `${castMemberId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            content: summary, active: true, createdAt: Date.now()
          });
        }
      }
    }
  }
  return normalizeStoryMemory(next);
}

export function applyUpdatesToCastState(castState: CastState, updates: any[], castMembers: StoryCastMember[], effectiveCharacters: Character[] = []): CastState {
  const next = normalizeCastState(castState, castMembers, effectiveCharacters);
  const characterByName = new Map<string, Character>(effectiveCharacters.map(c => [c.name.toLowerCase(), c]));
  
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const target = String(update.target || "").trim();
    const to = String(update.to || "").trim();
    const title = String(update.title || "Suggested update").trim();
    const details = String(update.details || "").trim();
    
    if (category === "character" || category === "outfit") {
      const character = findCharacterFromText(target || title, characterByName, effectiveCharacters);
      const castMember = castMembers.find(m => m.templateCharacterId === character?.id || m.id === target);
      const castMemberId = castMember?.id || target || "unknown_cast_member";
      
      const row = ensureCharacterState(next, castMemberId);
      if (category === "outfit") {
        row.outfit = to || details || row.outfit;
      } else {
        const lowerTitle = `${title} ${details}`.toLowerCase();
        if (lowerTitle.includes("mood") || lowerTitle.includes("attitude")) row.mood = to || details || row.mood;
        else if (lowerTitle.includes("condition") || lowerTitle.includes("injur") || lowerTitle.includes("status") || lowerTitle.includes("wound")) row.condition = to || details || row.condition;
        else if (lowerTitle.includes("know") || lowerTitle.includes("remember") || lowerTitle.includes("learn")) row.knowledge = appendLine(row.knowledge, to || details || title);
        else if (lowerTitle.includes("secret") || lowerTitle.includes("hiding")) row.temporarySecret = appendLine(row.temporarySecret, to || details || title);
        else if (lowerTitle.includes("instruction") || lowerTitle.includes("should")) row.sceneInstruction = appendLine(row.sceneInstruction, to || details || title);
        else row.currentGoal = to || details || row.currentGoal;
      }
      continue;
    }
    if (category === "relationship") {
      const character = findCharacterFromText(target || title, characterByName, effectiveCharacters);
      const castMember = castMembers.find(m => m.templateCharacterId === character?.id || m.id === target);
      const castMemberId = castMember?.id || target || "unknown_cast_member";
      
      const row = ensureRelationshipState(next, castMemberId);
      row.trustTensionNotes = appendLine(row.trustTensionNotes, to || details || title);
    }
  }
  return normalizeCastState(next, castMembers, effectiveCharacters);
}


function resolveWorldLocationFromText(world: World | null = null, label: string = ""): any {
  const normalizedLabel = normalizeMatchText(label);
  if (!normalizedLabel || !Array.isArray(world?.locations)) return null;
  return (world?.locations || []).find((location) => {
    const locationId = normalizeMatchText(location?.id || "");
    const locationName = normalizeMatchText(location?.name || "");
    return (locationId && locationId === normalizedLabel) || (locationName && locationName === normalizedLabel);
  }) || null;
}

export function appendRecentFact(context: CurrentContext, line: string): void {
  context.recentFacts.importantDiscoveries = appendLine(context.recentFacts.importantDiscoveries, line);
}

export function appendLine(existing: string | undefined, nextLine: string): string {
  const clean = String(nextLine || "").trim();
  if (!clean) return String(existing || "");
  const current = String(existing || "").trim();
  if (!current) return clean;
  if (current.includes(clean)) return current;
  return `${current}\n${clean}`;
}

export function formatUpdateSummary(update: any): string {
  const parts = [
    update.title || "Suggested update",
    update.target ? `Target: ${update.target}` : "",
    update.from || update.to ? `${update.from || "?"} → ${update.to || "?"}` : "",
    update.details || ""
  ].filter(Boolean);
  return parts.join(" — ");
}

export function findCharacterFromText(text: string, characterByName: Map<string, Character>, characters: Character[] = []): Character | null {
  const lower = String(text || "").toLowerCase();
  if (!lower) return null;
  for (const [name, character] of characterByName) {
    if (lower.includes(name)) return character;
  }
  return characters.find((character) => lower.includes(String(character.id).toLowerCase())) || null;
}

export function ensureCharacterState(castState: CastState, castMemberId: string): CastMemberState {
  let row = castState.activeCharacters.find((item) => item.castMemberId === castMemberId);
  if (!row) {
    row = { castMemberId, presence: "active", present: true, locationId: "with_user", outfit: "", mood: "", condition: "", currentGoal: "", knowledge: "", temporarySecret: "", sceneInstruction: "" };
    castState.activeCharacters.push(row);
  }
  return row;
}

export function ensureRelationshipState(castState: CastState, castMemberId: string): RelationshipState {
  let row = castState.relationships.find((item) => item.castMemberId === castMemberId);
  if (!row) {
    row = { castMemberId, relationshipToUser: "", trustTensionNotes: "", promisesConflicts: "" };
    castState.relationships.push(row);
  }
  return row;
}

export function chooseActiveCastLead(story: Story | null, effectiveCharacters: Character[] = []): Character | null {
  // Method legacy: we no longer choose a "lead" in the UI sense, but LLM generation sometimes needs a primary perspective.
  // We'll return the first active character if available, else null.
  if (!story || !effectiveCharacters.length) return null;
  const contextRows = Array.isArray(story.castState?.activeCharacters) ? story.castState.activeCharacters : [];
  const activeIds = contextRows
    .filter((row) => {
      const presence = normalizeCastPresence(row.presence || (row.present === false ? "inactive" : "active"));
      return presence === "active";
    })
    .map((row) => row.castMemberId)
    .filter(Boolean);
  
  for (const castMemberId of activeIds) {
    const char = effectiveCharacters.find(c => c.id === castMemberId);
    if (char) return char;
  }

  return null;
}

export function loadInitialState() {
  const storedWorlds = repository.worlds.list([]).map(normalizeWorld);
  const defaultWorldList = defaultWorlds.map(normalizeWorld);
  const worldById = new Map<string, World>();
  for (const world of [...storedWorlds, ...defaultWorldList]) worldById.set(world.id, world);
  const worlds = [...worldById.values()];
  repository.worlds.saveAll(worlds);

  const storedCharacters = repository.characters.list([]).map((character) => normalizeCharacter(character));
  const defaultCharacterList = defaultCharacters.map((character) => normalizeCharacter(character));
  const characterById = new Map<string, Character>();
  for (const character of [...storedCharacters, ...defaultCharacterList]) characterById.set(character.id, character);
  const characters = [...characterById.values()];
  repository.characters.saveAll(characters);

  const normalizedDefaultStories = defaultStories.map((story) => normalizeStory(story, worlds, characters));
  let storyMetas = repository.stories.listMeta([]);
  let didSeedStory = false;

  for (const story of normalizedDefaultStories) {
    const existingMeta = storyMetas.find((meta) => meta.id === story.id);
    const existingWorldAvailable = worlds.some((world) => world.id === story.templateWorldId);
    const existingCharactersAvailable = story.castMembers.every((m) => characters.some((character) => character.id === m.templateCharacterId));
    
    if (!existingMeta || !existingWorldAvailable || !existingCharactersAvailable) {
      repository.stories.saveStory(story);
      storyMetas = storyMetas.filter((meta) => meta.id !== story.id).concat(storyToMeta(story));
      didSeedStory = true;
    }
  }

  if (!storyMetas.length && normalizedDefaultStories.length && !didSeedStory) {
    for (const story of normalizedDefaultStories) repository.stories.saveStory(story);
    storyMetas = normalizedDefaultStories.map(storyToMeta);
  }

  repository.activeStory.clear();

  return {
    worlds,
    characters,
    storyMetas,
    activeStory: null,
    activeView: "landing",
    selectedCharacterSheetId: characters[0]?.id || "",
    selectedWorldSheetId: worlds[0]?.id || "",
    chatHistory: [],
    activeLoreMemory: []
  };
}

export function loadChatForStory(story: Story, worlds: World[], characters: Character[]): ChatMessage[] {
  const saved = repository.chats.load(story?.id, null);
  if (Array.isArray(saved)) return saved.map(normalizeChatMessage);
  const world = worlds.find((item) => item.id === story.templateWorldId) || worlds[0];
  const storyCharacters = getStoryCharactersFromLists(story, characters);
  if (!story || !world || !storyCharacters.length) return [];
  return [{ role: "assistant", content: buildOpeningMessage(story, world, storyCharacters) }];
}

export function getStoryCharactersFromLists(story: Story | null, characters: Character[]): Character[] {
  if (!story) return [];
  return resolveEffectiveStoryCharacters(story, characters);
}

// Re-export from canonical location for backward compatibility
export { uniqueCompact } from "./arrayUtils";

export function createAssistantReply(content: string): ChatMessage {
  return { role: "assistant", content, alternatives: [content], selectedIndex: 0 };
}

export function commitLastAssistantChoice(history: ChatMessage[]): ChatMessage[] {
  const nextHistory = history.map((message) => ({ ...message }));
  const lastMessage = nextHistory[nextHistory.length - 1];
  if (!isAssistantMessageWithOptions(lastMessage)) return nextHistory;
  const selectedText = lastMessage.alternatives?.[lastMessage.selectedIndex ?? 0] || lastMessage.content;
  lastMessage.content = selectedText;
  delete lastMessage.alternatives;
  delete lastMessage.selectedIndex;
  return nextHistory;
}

export function findLastAssistantIndex(history: ChatMessage[]): number {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "assistant") return index;
  }
  return -1;
}

export function appendGeneratedReplyToLastAssistant(history: ChatMessage[], continuation: string): ChatMessage[] {
  const nextHistory = history.map((message) => ({ ...message }));
  const lastAssistantIndex = findLastAssistantIndex(nextHistory);
  if (lastAssistantIndex === -1) return [...nextHistory, createAssistantReply(continuation)];
  const lastAssistant = nextHistory[lastAssistantIndex];
  const currentText = getMessageDisplayText(lastAssistant).trim();
  const continuationText = String(continuation || "").trim();
  lastAssistant.content = currentText ? `${currentText}\n\n${continuationText}` : continuationText;
  delete lastAssistant.alternatives;
  delete lastAssistant.selectedIndex;
  return nextHistory;
}

export function addAlternativeToLastAssistant(history: ChatMessage[], reply: string): ChatMessage[] {
  const nextHistory = history.map((message) => ({
    ...message,
    alternatives: Array.isArray(message.alternatives) ? [...message.alternatives] : message.alternatives
  }));
  const lastMessage = nextHistory[nextHistory.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return [...nextHistory, createAssistantReply(reply)];
  }
  if (!Array.isArray(lastMessage.alternatives)) {
    lastMessage.alternatives = [lastMessage.content || ""];
    lastMessage.selectedIndex = 0;
  }
  lastMessage.alternatives.push(reply);
  lastMessage.selectedIndex = lastMessage.alternatives.length - 1;
  lastMessage.content = reply;
  return nextHistory;
}

export function parseSuggestedUpdates(rawText: string): any[] {
  const text = String(rawText || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return [];
  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const updates = Array.isArray(parsed.updates) ? parsed.updates : [];
    return updates.map((update, index) => normalizeSuggestedUpdate(update, index)).filter((update) => update.title || update.details || update.to);
  } catch (error) {
    console.warn("Could not parse suggested updates JSON:", error, rawText);
    return [];
  }
}

export function normalizeSuggestedUpdate(update: any, index: number) {
  const source = update && typeof update === "object" ? update : {};
  const category = String(source.category || "other").trim().toLowerCase();
  const confidence = Number(source.confidence);
  return {
    id: `suggested_update_${Date.now()}_${index}`,
    category: category || "other",
    title: String(source.title || source.label || "Suggested update").trim(),
    target: String(source.target || source.character || source.object || source.location || "").trim(),
    from: String(source.from || "").trim(),
    to: String(source.to || source.value || "").trim(),
    details: String(source.details || source.reason || source.description || "").trim(),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null
  };
}

export function validateIncomingCharacterBundle(character: any) {
  const issues = [];
  if (!character || typeof character !== "object") issues.push("Missing character object.");
  if (character && !String(character.name || "").trim()) issues.push("Character name is required.");
  const lorebook = character?.lorebook || character?.characterLorebook || [];
  if (lorebook && !Array.isArray(lorebook)) issues.push("Character lorebook must be an array when provided.");
  return { ok: issues.length === 0, issues };
}

export function validateIncomingWorldBundle(world: any) {
  const issues = [];
  if (!world || typeof world !== "object") issues.push("Missing world object.");
  if (world && !String(world.name || "").trim()) issues.push("World name is required.");
  const lorebook = world?.worldLorebook || world?.lorebook || [];
  if (lorebook && !Array.isArray(lorebook)) issues.push("World lorebook must be an array when provided.");
  if (world?.locations && !Array.isArray(world.locations)) issues.push("Locations must be an array when provided.");
  return { ok: issues.length === 0, issues };
}

export function validateStoryExportBundle(bundle: any) {
  const issues = [];
  if (!bundle.story) issues.push("Missing story data.");
  if (!bundle.world) issues.push("Missing world data.");
  if (!Array.isArray(bundle.characters) || bundle.characters.length === 0) issues.push("Missing character data.");
  if (bundle.story && !String(bundle.story.templateWorldId || "").trim()) issues.push("Story templateWorldId is missing.");
  if (bundle.story && !String(bundle.story.templateWorldKey || "").trim()) issues.push("Story templateWorldKey is missing.");
  if (bundle.story && !Array.isArray(bundle.story.storyLorebook)) issues.push("Story lorebook is missing or invalid.");
  if (bundle.story && (!bundle.story.worldOverlay || typeof bundle.story.worldOverlay !== "object")) issues.push("Story worldOverlay is missing or invalid.");
  if (bundle.world && !Array.isArray(bundle.world.worldLorebook)) issues.push("World lorebook is missing or invalid.");
  if (bundle.world && !String(bundle.world.templateKey || "").trim()) issues.push("World templateKey is missing.");
  if (Array.isArray(bundle.characters)) {
    for (const character of bundle.characters) {
      if (!Array.isArray(character.lorebook)) issues.push(`Character lorebook is missing or invalid for ${character.name || character.id}.`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateIncomingStoryBundle(bundle: any) {
  if (!bundle || typeof bundle !== "object") return "Invalid story file. Could not find story bundle data.";
  if (!bundle.story || !bundle.world || !Array.isArray(bundle.characters)) return "Invalid story file. It must include story, world, and characters.";
  if (bundle.characters.length === 0) return "Invalid story file. It must include at least one character.";
  if (!bundle.world.name) return "Invalid story file. The world needs a name.";
  if (!bundle.characters.some((character: any) => character && character.name)) return "Invalid story file. At least one character needs a name.";
  return "";
}

export function hydrateBundleLore(bundle: any, storySource: any, worldSource: any, characterSources: any[]) {
  if (!bundle.completeLore) return;
  if (!Array.isArray(storySource.storyLorebook) && Array.isArray(bundle.completeLore.storyLorebook)) {
    storySource.storyLorebook = bundle.completeLore.storyLorebook;
  }
  if (!Array.isArray(worldSource.worldLorebook) && Array.isArray(bundle.completeLore.worldLorebook)) {
    worldSource.worldLorebook = bundle.completeLore.worldLorebook;
  }
  if (!Array.isArray(bundle.completeLore.characterLorebooks)) return;
  for (const character of characterSources) {
    const loreMatch = bundle.completeLore.characterLorebooks.find((entry: any) => entry.characterId === character.id);
    if (!Array.isArray(character.lorebook) && loreMatch) {
      character.lorebook = loreMatch.lorebook || [];
    }
  }
}

export function remapImportedContextCastIds(context: any, idMap: Record<string, string>) {
  if (!context || typeof context !== "object") return context;
  return { ...context, activeCharacters: remapCastRows(context.activeCharacters, idMap), relationships: remapCastRows(context.relationships, idMap) };
}

export function remapImportedCastStateIds(castState: any, idMap: Record<string, string>) {
  if (!castState || typeof castState !== "object") return castState;
  return { ...castState, activeCharacters: remapCastRows(castState.activeCharacters, idMap), relationships: remapCastRows(castState.relationships, idMap) };
}

export function remapCastRows(rows: any[], idMap: Record<string, string>) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const oldId = row.castMemberId || row.characterId || row.id;
    return { ...row, castMemberId: idMap[oldId] || oldId };
  });
}

export function buildStoryExportBundle(story: Story, getWorld: (id: string) => World | null, getStoryCharacters: (story: Story) => Character[], chatHistory: ChatMessage[]) {
  const world = getWorld(story.templateWorldId);
  const storyCharacters = getStoryCharacters(story);
  return {
    type: "roleplay-story-bundle",
    version: 2,
    exportedAt: new Date().toISOString(),
    story: cloneJson(story),
    world: cloneJson(world),
    characters: cloneJson(storyCharacters),
    completeLore: {
      storyLorebook: cloneJson(story.storyLorebook || []),
      worldLorebook: cloneJson(world?.worldLorebook || []),
      characterLorebooks: storyCharacters.map((character) => ({ characterId: character.id, characterName: character.name, lorebook: cloneJson(character.lorebook || []) }))
    },
    chatHistory: cloneJson(chatHistory)
  };
}
