import { 
  Story, World, Character, CurrentContext, ChatMessage, LoreEntry, CastState
} from "../types/index";
import { CHAT_CONTEXT_MESSAGES } from "../constants/defaultData";
import { buildDirectorNotesPrompt, formatLoreForPrompt } from "./lore";

const MAX_AVAILABLE_LOCATIONS = 6;
const MAX_RELEVANT_OBJECTS = 8;

interface RequestParams {
  story: Story;
  world: World;
  character: Character;
  characters?: Character[];
  history?: ChatMessage[];
  activeLoreMemory?: LoreEntry[];
  privateInstruction?: string;
  extraMessages?: ChatMessage[];
}

export function buildMessagesForRequest({
  story,
  world,
  character,
  characters = [],
  history = [],
  activeLoreMemory = [],
  privateInstruction = "",
  extraMessages = []
}: RequestParams): ChatMessage[] {
  return [
    {
      role: "system",
      content: buildSystemPrompt({
        story,
        world,
        character,
        characters,
        history,
        injectedLoreText: formatLoreForPrompt(activeLoreMemory),
        privateInstruction
      })
    },
    ...history.slice(-CHAT_CONTEXT_MESSAGES).map(toApiMessage),
    ...extraMessages.map(toApiMessage)
  ];
}

export function toApiMessage(message: ChatMessage): ChatMessage {
  return {
    role: message.role === "user" ? "user" : "assistant",
    content: String(message.content || "")
  };
}

interface PromptParams {
  story: Story;
  world: World;
  character: Character;
  characters?: Character[];
  history?: ChatMessage[];
  injectedLoreText?: string;
  privateInstruction?: string;
}

export function buildSystemPrompt({
  story,
  world,
  character,
  characters = [],
  history = [],
  injectedLoreText = "",
  privateInstruction = ""
}: PromptParams): string {
  const smartContext = buildSmartPromptContext({
    story,
    world,
    character,
    characters,
    history,
    privateInstruction
  });

  const activeNames = smartContext.fullCharacters.map((item) => item.name).join(", ") || "None";
  const nearbyNames = smartContext.nearbyCharacters.map((item) => item.name).join(", ") || "None";
  const inactiveNames = smartContext.inactiveCharacters.map((item) => item.name).join(", ") || "None";
  const castNames = smartContext.allCharacters.map((item) => item.name).join(", ") || "No cast selected";

  return `
You are roleplaying the AI-controlled cast for this story.
Active cast for this reply: ${activeNames}.
Nearby/background cast: ${nearbyNames}.
Inactive/off-scene cast: ${inactiveNames}.
Total story cast: ${castNames}.

[Story Core]
${section("Title", story?.title)}
${section("Scenario", compactText(story?.scenario, 900))}
${section("Current Objective", smartContext.currentObjective)}

[Story Memory]
${formatStoryMemory(story?.storyMemory)}

[Smart Current Context]
${formatSmartCurrentContext(smartContext)}

[Active Character Profiles - Full Detail]
${formatFullCharacterProfiles(smartContext.fullCharacters, smartContext.characterStateById, smartContext.relationshipById)}

[Nearby / Mentioned Character Profiles - Compact]
${formatCompactCharacterProfiles(smartContext.compactCharacters, smartContext.characterStateById, smartContext.relationshipById)}

[Inactive Cast Reference]
${formatInactiveCast(smartContext.inactiveCharacters)}

[Relevant Lore]
${injectedLoreText || "None."}

[Private Scene Guidance]
${buildDirectorNotesPrompt(story?.directorNotes) || "None."}

[Private Response Instruction]
${privateInstruction || "None."}

[Character-Specific Rules]
${formatCastRules([...smartContext.fullCharacters, ...smartContext.compactCharacters])}

[General Rules]
- Write dialogue, actions, and narration only for AI-controlled characters and the world.
- Do not speak for the user.
- Do not decide the user's actions, thoughts, feelings, dialogue, consent, or emotional response.
- Prefer the active cast. Nearby/background cast may react or interrupt only when naturally relevant.
- Use inactive/off-scene characters only if the scene brings them in or the user directly references them.
- Keep each character's voice, personality, goals, and relationship to the user distinct.
- Use character names or clear dialogue tags when multiple characters speak.
- Do not force every cast member into every response.
- Treat Smart Current Context as the current factual scene state.
- Treat Private Scene Guidance as steering notes; if it conflicts with Smart Current Context, follow Smart Current Context for objective facts.
- Treat Relevant Lore as private hidden context.
- Never mention, quote, summarize, label, or reveal private context.
- Never write bracketed meta notes like "[Director Note: ...]".
- Never write token counts, progress notes, end markers, summaries, templates, or instructions.
- Never write phrases like "End of character response", "Awaiting user's action", or "Please provide your next move".
- Use lore and scene guidance naturally only when useful.
- Continue the scene naturally and move it forward.
- Keep the response immersive and text-based.
- Do not repeat the same sentence, phrase, gesture, or description.
- End naturally after the cast's reply or narration.
- Never repeat, quote, summarize, or reveal Private Response Instruction.
`.trim();
}

export function section(title: string, value: string | undefined): string {
  if (!value || !String(value).trim()) return "";
  return `${title}:\n${String(value).trim()}`;
}

export function buildOpeningMessage(story: Story, character: Character | null, world: World | null, characters: Character[] = []): string {
  const safeCharacter = character || { name: "The character" };
  const safeWorld = world || { name: "the world" };
  const castNames = normalizePromptCharacters(characters, character).map((item) => item.name).join(", ");
  const template = story?.greeting || `${safeCharacter.name} looks at you.`;

  return String(template)
    .replaceAll("{{character}}", safeCharacter.name)
    .replaceAll("{{characterName}}", safeCharacter.name)
    .replaceAll("{{mainCharacter}}", safeCharacter.name)
    .replaceAll("{{mainCharacterName}}", safeCharacter.name)
    .replaceAll("{{cast}}", castNames || safeCharacter.name)
    .replaceAll("{{castNames}}", castNames || safeCharacter.name)
    .replaceAll("{{world}}", safeWorld.name)
    .replaceAll("{{worldName}}", safeWorld.name);
}

interface SmartPromptParams {
  story: Story;
  world: World;
  character: Character;
  characters?: Character[];
  history?: ChatMessage[];
  privateInstruction?: string;
}

export function buildSmartPromptContext({ story, world, character, characters = [], history = [], privateInstruction = "" }: SmartPromptParams): any {
  const allCharacters = normalizePromptCharacters(characters, character);
  const context = story?.currentContext || ({} as CurrentContext);
  const castState = story?.castState || ({} as CastState);
  const characterStateById = new Map<string, any>((castState.activeCharacters || []).map((row: any) => [row.characterId, row]));
  const relationshipById = new Map<string, any>((castState.relationships || []).map((row: any) => [row.characterId, row]));
  const triggerText = normalizeMatchText([
    story?.title,
    story?.scenario,
    story?.storyMemory?.summary,
    ...(Array.isArray(story?.storyMemory?.generalJournal)
      ? story.storyMemory.generalJournal.filter((e: any) => e.active !== false).map((e: any) => e.content)
      : []),
    context.scene?.currentObjective,
    context.scene?.currentConflict,
    context.location?.name,
    context.location?.description,
    context.location?.availableLocations,
    context.recentFacts?.importantDiscoveries,
    context.recentFacts?.secretsRevealed,
    context.recentFacts?.openQuestions,
    buildDirectorNotesPrompt(story?.directorNotes),
    privateInstruction,
    ...(history || []).slice(-CHAT_CONTEXT_MESSAGES).map((message) => message?.content || "")
  ].filter(Boolean).join("\n"));

  const activeIds = new Set<string>();
  const nearbyIds = new Set<string>();
  for (const row of castState.activeCharacters || []) {
    const presence = normalizePresence(row);
    if (!row?.characterId) continue;
    if (presence === "active") activeIds.add(row.characterId);
    if (presence === "nearby") nearbyIds.add(row.characterId);
  }
  if (activeIds.size === 0 && allCharacters[0]?.id) activeIds.add(allCharacters[0].id);

  const mentionedIds = new Set<string>();
  const pinnedIds = new Set<string>();
  for (const castCharacter of allCharacters) {
    if (castCharacter.promptPinned) pinnedIds.add(castCharacter.id);
    if (doesTriggerMentionCharacter(triggerText, castCharacter)) mentionedIds.add(castCharacter.id);
  }

  const fullCharacterIds = new Set<string>([...activeIds, ...pinnedIds]);
  const compactCharacterIds = new Set<string>([...nearbyIds, ...mentionedIds].filter((id) => !fullCharacterIds.has(id)));

  const fullCharacters = allCharacters.filter((item) => fullCharacterIds.has(item.id));
  const compactCharacters = allCharacters.filter((item) => compactCharacterIds.has(item.id));
  const nearbyCharacters = allCharacters.filter((item) => nearbyIds.has(item.id) && !fullCharacterIds.has(item.id));
  const inactiveCharacters = allCharacters.filter((item) => !fullCharacterIds.has(item.id) && !compactCharacterIds.has(item.id));

  const worldLocations = Array.isArray(world?.locations) ? world.locations : [];
  const currentLocation = selectCurrentLocation(context.location, worldLocations, triggerText);
  const availableLocations = selectAvailableLocations({
    contextLocation: context.location,
    currentLocation,
    worldLocations,
    triggerText
  });
  const relevantObjects = selectRelevantObjects({
    objects: context.objects || [],
    triggerText,
    currentLocation,
    fullCharacters
  });

  return {
    story,
    world,
    context,
    castState,
    allCharacters,
    fullCharacters,
    compactCharacters,
    nearbyCharacters,
    inactiveCharacters,
    characterStateById,
    relationshipById,
    triggerText,
    currentLocation,
    availableLocations,
    relevantObjects,
    currentObjective: context.scene?.currentObjective || story?.directorNotes?.nextStoryBeat || ""
  };
}

function formatStoryMemory(memory: any): string {
  const source = memory && typeof memory === "object" ? memory : {};
  const sections: string[] = [];

  if (String(source.summary || "").trim()) {
    sections.push(`Core Summary:\n${compactText(source.summary, 900)}`);
  }

  const activeJournal = (Array.isArray(source.generalJournal) ? source.generalJournal : [])
    .filter((entry: any) => entry.active !== false && String(entry.content || "").trim());
  if (activeJournal.length) {
    sections.push(`General Journal:\n${activeJournal.map((entry: any) => `- ${compactText(entry.content, 300)}`).join("\n")}`);
  }

  const charJournals = source.characterJournals && typeof source.characterJournals === "object" ? source.characterJournals : {};
  const charEntries = Object.entries(charJournals)
    .flatMap(([, entries]) => (Array.isArray(entries) ? entries : [])
      .filter((entry: any) => entry.active !== false && String(entry.content || "").trim())
      .map((entry: any) => `- ${compactText(entry.content, 300)}`));
  if (charEntries.length) {
    sections.push(`Character Journal:\n${charEntries.join("\n")}`);
  }

  const activeTasks = (Array.isArray(source.tasks) ? source.tasks : [])
    .filter((task: any) => task.active !== false && String(task.content || "").trim());
  if (activeTasks.length) {
    sections.push(`Active Tasks:\n${activeTasks.map((task: any) => `- ${task.completed ? "[done] " : ""}${compactText(task.content, 300)}`).join("\n")}`);
  }

  return sections.length ? sections.join("\n\n") : "No story memory included.";
}

function formatSmartCurrentContext(smartContext: any): string {
  const { world, context, currentLocation, availableLocations, relevantObjects } = smartContext;
  const sceneLines = [
    context.scene?.timeOfDay ? `Time of Day: ${context.scene.timeOfDay}` : "",
    context.scene?.atmosphere ? `Atmosphere: ${context.scene.atmosphere}` : "",
    context.scene?.currentConflict ? `Current Conflict: ${context.scene.currentConflict}` : "",
    context.scene?.currentObjective ? `Current Objective: ${context.scene.currentObjective}` : ""
  ].filter(Boolean);

  const worldLines = [
    world?.name ? `World: ${world.name}` : "",
    (world?.overview || world?.shortDescription) ? `Overview: ${world.overview || world.shortDescription}` : "",
    world?.rules ? `World Rules Summary: ${compactText(world.rules, 700)}` : ""
  ].filter(Boolean);

  const locationLines = [
    currentLocation?.name ? `Current Location: ${currentLocation.name}` : (context.location?.name ? `Current Location: ${context.location.name}` : ""),
    currentLocation?.description ? `Description: ${compactText(currentLocation.description, 700)}` : (context.location?.description ? `Description: ${compactText(context.location.description, 700)}` : ""),
    currentLocation?.mood ? `Location Mood: ${currentLocation.mood}` : "",
    currentLocation?.visibleExits || context.location?.visibleExits ? `Visible Exits: ${currentLocation?.visibleExits || context.location.visibleExits}` : "",
    currentLocation?.hazards || context.location?.hazards ? `Hazards: ${currentLocation?.hazards || context.location.hazards}` : ""
  ].filter(Boolean);

  const availableLines = availableLocations.map((location: any) => formatLocationCompact(location)).filter(Boolean);
  const objectLines = relevantObjects.map(formatObjectLine).filter(Boolean);
  const factLines = [
    context.recentFacts?.importantDiscoveries ? `Important Discoveries: ${context.recentFacts.importantDiscoveries}` : "",
    context.recentFacts?.secretsRevealed ? `Secrets Revealed: ${context.recentFacts.secretsRevealed}` : "",
    context.recentFacts?.openQuestions ? `Open Questions: ${context.recentFacts.openQuestions}` : ""
  ].filter(Boolean);

  const blocks: string[] = [];
  if (worldLines.length) blocks.push(`[World Summary]\n${worldLines.join("\n")}`);
  if (sceneLines.length) blocks.push(`[Scene]\n${sceneLines.join("\n")}`);
  if (locationLines.length) blocks.push(`[Current Location]\n${locationLines.join("\n")}`);
  if (availableLines.length) blocks.push(`[Available / Nearby Locations]\n${availableLines.join("\n")}`);
  if (objectLines.length) blocks.push(`[Relevant Objects]\n${objectLines.join("\n")}`);
  if (factLines.length) blocks.push(`[Recent Facts]\n${factLines.join("\n")}`);

  return blocks.join("\n\n") || "No current context saved.";
}

function formatFullCharacterProfiles(characters: Character[], characterStateById: Map<string, any>, relationshipById: Map<string, any>): string {
  if (!characters.length) return "No active character profile available.";

  return characters.map((character) => {
    const state = characterStateById.get(character.id) || {};
    const relationship = relationshipById.get(character.id) || {};
    const roleLabel = "Active Character";
    const stateLines = [
      state.outfit || character.defaultOutfit ? `Current Outfit: ${state.outfit || character.defaultOutfit}` : "",
      state.mood ? `Mood: ${state.mood}` : "",
      state.condition ? `Condition: ${state.condition}` : "",
      state.currentGoal ? `Current Goal: ${state.currentGoal}` : "",
      state.knowledge ? `Knows / Remembers: ${state.knowledge}` : "",
      state.temporarySecret ? `Temporary Secret: ${state.temporarySecret}` : "",
      state.sceneInstruction ? `Scene Instruction: ${state.sceneInstruction}` : "",
      relationship.relationshipToUser ? `Current Relationship to User: ${relationship.relationshipToUser}` : "",
      relationship.trustTensionNotes ? `Trust / Tension: ${relationship.trustTensionNotes}` : "",
      relationship.promisesConflicts ? `Promises / Conflicts: ${relationship.promisesConflicts}` : ""
    ].filter(Boolean);

    return `
${roleLabel}: ${character.name}
${section("Race / Type", character.race)}
${section("Story Role", character.role)}
${section("Prompt Summary", character.profileSummary || character.shortDescription)}
${section("Core Description", compactText(character.description, 800))}
${section("Appearance", compactText(character.appearance, 500))}
${section("Personality", compactText(character.personality, 500))}
${section("Backstory", compactText(character.backstory, 650))}
${section("Speaking Style", character.speakingStyle)}
${section("Base Relationship to User", character.relationshipToUser)}
${section("Goals / Motivation", character.goals)}
${stateLines.length ? `Current State:\n${stateLines.join("\n")}` : ""}
`.trim();
  }).join("\n\n");
}

function formatCompactCharacterProfiles(characters: Character[], characterStateById: Map<string, any>, relationshipById: Map<string, any>): string {
  if (!characters.length) return "None.";
  return characters.map((character) => {
    const state = characterStateById.get(character.id) || {};
    const relationship = relationshipById.get(character.id) || {};
    const parts = [
      character.race ? `race/type: ${character.race}` : "",
      character.role ? `role: ${character.role}` : "",
      character.profileSummary || character.shortDescription || character.description ? `summary: ${compactText(character.profileSummary || character.shortDescription || character.description, 260)}` : "",
      normalizePresence(state) === "nearby" ? "nearby/background" : normalizePresence(state) === "inactive" ? "not currently present" : "",
      state.mood ? `mood: ${state.mood}` : "",
      state.condition ? `condition: ${state.condition}` : "",
      state.currentGoal ? `goal: ${compactText(state.currentGoal, 120)}` : "",
      state.knowledge ? `knows: ${compactText(state.knowledge, 120)}` : "",
      relationship.relationshipToUser ? `relationship: ${relationship.relationshipToUser}` : character.relationshipToUser ? `relationship: ${character.relationshipToUser}` : ""
    ].filter(Boolean);
    return `- ${character.name}: ${parts.join("; ") || "mentioned cast member"}`;
  }).join("\n");
}

function formatInactiveCast(characters: Character[]): string {
  if (!characters.length) return "None.";
  return characters.map((character) => {
    const label = [character.name, character.race, character.role || character.shortDescription]
      .filter(Boolean)
      .join(" — ");
    return `- ${label}`;
  }).join("\n");
}

function formatCastRules(characters: Character[]): string {
  const rules = characters
    .map((character) => {
      const text = String(character.characterRules || "").trim();
      return text ? `${character.name}:\n${text}` : "";
    })
    .filter(Boolean);

  return rules.length ? rules.join("\n\n") : "None.";
}

function normalizePromptCharacters(characters: Character[] = [], fallbackCharacter: Character | null = null): Character[] {
  const byId = new Map<string, Character>();
  for (const character of characters || []) {
    if (character?.id && !byId.has(character.id)) byId.set(character.id, character);
  }
  if (fallbackCharacter?.id && !byId.has(fallbackCharacter.id)) byId.set(fallbackCharacter.id, fallbackCharacter);
  return Array.from(byId.values()).filter(Boolean);
}

function doesTriggerMentionCharacter(triggerText: string, character: Character): boolean {
  const needles = [
    character.name,
    character.race,
    character.role,
    ...(Array.isArray(character.aliases) ? character.aliases : []),
    ...(Array.isArray(character.promptKeywords) ? character.promptKeywords : [])
  ].filter(Boolean);
  return needles.some((needle) => textIncludesNeedle(triggerText, needle));
}

function selectCurrentLocation(contextLocation: any = {}, worldLocations: any[] = [], triggerText: string = ""): any {
  const contextLocationId = String(contextLocation?.locationId || contextLocation?.id || "").trim();
  const contextName = contextLocation?.name || "";

  const exactById = contextLocationId
    ? worldLocations.find((location) => String(location?.id || "") === contextLocationId)
    : null;
  if (exactById) {
    return {
      ...exactById,
      id: String(exactById.id || contextLocationId),
      availableLocations: contextLocation.availableLocations || exactById.availableLocations,
    };
  }

  const exactByName = worldLocations.find((location) => sameText(location.name, contextName));
  if (exactByName) {
    return mergeLocation(exactByName, contextLocation);
  }

  const mentioned = worldLocations.find((location) => doesTriggerMentionLocation(triggerText, location));
  if (mentioned && !contextName && !contextLocationId) return mentioned;

  if (contextName || contextLocation?.description || contextLocationId) {
    return {
      id: contextLocationId || contextLocation.id || "current_location",
      name: contextName,
      summary: contextLocation.summary || "",
      description: contextLocation.description || "",
      mood: contextLocation.mood || "",
      visibleExits: contextLocation.visibleExits || "",
      hazards: contextLocation.hazards || "",
      keywords: []
    };
  }

  return worldLocations[0] || null;
}

interface SelectLocationsParams {
  contextLocation?: any;
  currentLocation?: any;
  worldLocations?: any[];
  triggerText?: string;
}

function selectAvailableLocations({ contextLocation = {}, currentLocation = null, worldLocations = [], triggerText = "" }: SelectLocationsParams): any[] {
  const currentId = String(currentLocation?.id || contextLocation?.locationId || contextLocation?.id || "").trim();
  const currentName = currentLocation?.name || contextLocation?.name || "";
  const explicitText = String(contextLocation?.availableLocations || "").trim();
  const explicitLocations = explicitText
    ? explicitText.split("\n").map((line, index) => {
        const [namePart, ...rest] = line.split(/[:–—-]/);
        return {
          id: `context_available_${index}`,
          name: namePart?.trim() || line.trim(),
          summary: rest.join("-").trim(),
          description: rest.join("-").trim(),
          keywords: []
        };
      }).filter((location) => location.name)
    : [];

  const connectedLocations = worldLocations.filter((location) => {
    if (isSameLocation(location, currentId, currentName)) return false;
    const connectionText = normalizeMatchText([location.connectedTo, location.visibleExits, location.exits].filter(Boolean).join(" "));
    return Boolean(connectionText) && ((currentId && textIncludesNeedle(connectionText, currentId)) || (currentName && textIncludesNeedle(connectionText, currentName)));
  });

  const mentionedLocations = worldLocations.filter((location) => {
    if (isSameLocation(location, currentId, currentName)) return false;
    return doesTriggerMentionLocation(triggerText, location);
  });

  const fallbackLocations = worldLocations.filter((location) => !isSameLocation(location, currentId, currentName));
  return uniqueLocations([...explicitLocations, ...connectedLocations, ...mentionedLocations, ...fallbackLocations])
    .slice(0, MAX_AVAILABLE_LOCATIONS);
}

interface SelectObjectsParams {
  objects?: any[];
  triggerText?: string;
  currentLocation?: any;
  fullCharacters?: Character[];
}

function selectRelevantObjects({ objects = [], triggerText = "", currentLocation = null, fullCharacters = [] }: SelectObjectsParams): any[] {
  const currentLocationName = currentLocation?.name || "";
  const activeNames = new Set(fullCharacters.map((character) => normalizeMatchText(character.name)));

  return (objects || []).filter((object) => {
    const name = String(object.name || "");
    const holder = normalizeMatchText(object.locationOrHolder || "");
    const status = normalizeMatchText(object.status || "");
    if (status.includes("hidden") && !textIncludesNeedle(triggerText, name)) return false;
    if (textIncludesNeedle(triggerText, name)) return true;
    if (currentLocationName && holder.includes(normalizeMatchText(currentLocationName))) return true;
    if (holder.includes("user") || holder.includes("inventory")) return true;
    for (const activeName of activeNames) {
      if (activeName && holder.includes(activeName)) return true;
    }
    return status.includes("active") || status.includes("visible") || status.includes("inventory");
  }).slice(0, MAX_RELEVANT_OBJECTS);
}

function formatLocationCompact(location: any): string {
  if (!location?.name) return "";
  const details = [
    location.summary || "",
    location.mood ? `mood: ${location.mood}` : "",
    location.visibleExits ? `exits: ${location.visibleExits}` : "",
    location.hazards ? `hazards: ${location.hazards}` : ""
  ].filter(Boolean).join("; ");
  return `- ${location.name}${details ? `: ${compactText(details, 260)}` : ""}`;
}

function formatObjectLine(object: any): string {
  if (!object?.name) return "";
  const details = [
    object.locationOrHolder ? `where: ${object.locationOrHolder}` : "",
    object.visibleState ? `visible: ${object.visibleState}` : "",
    object.hiddenDetail ? `hidden: ${object.hiddenDetail}` : "",
    object.status ? `status: ${object.status}` : ""
  ].filter(Boolean).join("; ");
  return `- ${object.name}${details ? ` (${details})` : ""}`;
}

function doesTriggerMentionLocation(triggerText: string, location: any): boolean {
  const needles = [
    location.name,
    ...(Array.isArray(location.keywords) ? location.keywords : [])
  ].filter(Boolean);
  return needles.some((needle) => textIncludesNeedle(triggerText, needle));
}

function mergeLocation(worldLocation: any, contextLocation: any): any {
  return {
    ...worldLocation,
    id: String(contextLocation.locationId || contextLocation.id || worldLocation.id || ""),
    name: contextLocation.name || worldLocation.name,
    description: contextLocation.description || worldLocation.description,
    visibleExits: contextLocation.visibleExits || worldLocation.visibleExits,
    hazards: contextLocation.hazards || worldLocation.hazards,
    availableLocations: contextLocation.availableLocations || worldLocation.availableLocations
  };
}

function uniqueLocations(locations: any[]): any[] {
  const byKey = new Map<string, any>();
  for (const location of locations || []) {
    const key = normalizeMatchText(String(location?.id || "")) || normalizeMatchText(location?.name || "");
    if (key && !byKey.has(key)) byKey.set(key, location);
  }
  return Array.from(byKey.values());
}

function isSameLocation(location: any, currentId: string, currentName: string): boolean {
  if (currentId && String(location?.id || "") === currentId) return true;
  if (currentName && sameText(location?.name || "", currentName)) return true;
  return false;
}

function sameText(a: string, b: string): boolean {
  return normalizeMatchText(a) === normalizeMatchText(b) && normalizeMatchText(a) !== "";
}

function textIncludesNeedle(text: string, needle: string): boolean {
  const cleanNeedle = normalizeMatchText(needle);
  if (!cleanNeedle || !text) return false;
  if (cleanNeedle.includes(" ")) return text.includes(cleanNeedle);
  const escaped = cleanNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function normalizeMatchText(text: string | undefined): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(text: string | undefined, maxLength: number = 500): string {
  const clean = String(text || "").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

function normalizePresence(row: any = {}): string {
  const raw = String(row?.presence || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw;
  return row?.present === false ? "inactive" : "active";
}
