// Pure helper functions extracted from App.jsx.
// None of these reference React state directly.

import { defaultWorlds, defaultCharacters } from "../constants/defaultData.js";
import { normalizeCastState, normalizeCharacter, normalizeStory, normalizeWorld, normalizeDirectorNotes, normalizeCurrentContext, normalizeStoryMemory, normalizeChatMessage, normalizeStoredLorebook } from "../services/normalizers.js";
import { buildOpeningMessage } from "../services/prompt.js";
import { repository } from "../services/repository.js";
import { cloneJson, createId } from "./helpers.js";
import { defaultStories } from "../constants/defaultData.js";
import { getMessageDisplayText, isAssistantMessageWithOptions } from "../components/ChatView.jsx";

export function normalizeCastPresence(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw;
  if (raw === "true") return "active";
  if (raw === "false") return "inactive";
  return value === false ? "inactive" : "active";
}

export function syncDirectorNotesFromContext(notes, _context) {
  return normalizeDirectorNotes(notes);
}

export function syncCurrentContextFromDirectorNotes(context, notes) {
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

export function createInitialCurrentContext(world, _storyCharacters) {
  return normalizeCurrentContext({
    scene: {
      timeOfDay: "",
      atmosphere: "",
      currentConflict: "",
      currentObjective: ""
    },
    location: {
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

export function createInitialCastState(characters = []) {
  return normalizeCastState({
    activeCharacters: (characters || []).map((character) => ({
      characterId: character.id,
      presence: "active",
      present: true,
      outfit: character.defaultOutfit || "",
      mood: "",
      condition: "",
      currentGoal: character.goals || "",
      knowledge: "",
      temporarySecret: "",
      sceneInstruction: ""
    })),
    relationships: (characters || []).map((character) => ({
      characterId: character.id,
      relationshipToUser: character.relationshipToUser || "",
      trustTensionNotes: "",
      promisesConflicts: ""
    }))
  }, characters);
}

export function applyUpdatesToCurrentContext(context, updates, world = null) {
  const next = normalizeCurrentContext(context);
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const target = String(update.target || "").trim();
    const to = String(update.to || "").trim();
    const title = String(update.title || "Suggested update").trim();
    const details = String(update.details || "").trim();
    const summary = formatUpdateSummary(update);
    if (category === "location") {
      if (to || target) next.location.name = to || target || next.location.name;
      if (details) next.location.description = appendLine(next.location.description, details);
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

export function applyUpdatesToStoryMemory(storyMemory, updates = []) {
  const next = normalizeStoryMemory(storyMemory);
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const summary = formatUpdateSummary(update);
    if (category === "memory") {
      next.generalJournal = [
        ...next.generalJournal,
        { id: `general-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, content: summary, active: true, createdAt: Date.now() }
      ];
    }
    if (category === "relationship" || category === "character") {
      const target = String(update.target || "").trim();
      const titleText = `${update.title || ""} ${update.details || ""}`.toLowerCase();
      if (target) {
        const charId = target.toLowerCase().replace(/\s+/g, "-");
        if (!next.characterJournals[charId]) next.characterJournals[charId] = [];
        if (titleText.includes("learn") || titleText.includes("know") || titleText.includes("remember") || titleText.includes("trust") || titleText.includes("suspect")) {
          next.characterJournals[charId].push({
            id: `${charId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: summary, active: true, createdAt: Date.now()
          });
        }
      }
    }
  }
  return normalizeStoryMemory(next);
}

export function applyUpdatesToCastState(castState, updates, characters = []) {
  const next = normalizeCastState(castState, characters);
  const characterByName = new Map((characters || []).map((character) => [character.name.toLowerCase(), character]));
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const target = String(update.target || "").trim();
    const to = String(update.to || "").trim();
    const title = String(update.title || "Suggested update").trim();
    const details = String(update.details || "").trim();
    if (category === "character" || category === "outfit") {
      const character = findCharacterFromText(target || title, characterByName, characters);
      const row = ensureCharacterState(next, character?.id || target || "unknown_character");
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
      const character = findCharacterFromText(target || title, characterByName, characters);
      const row = ensureRelationshipState(next, character?.id || target || "unknown_character");
      row.trustTensionNotes = appendLine(row.trustTensionNotes, to || details || title);
    }
  }
  return normalizeCastState(next, characters);
}

export function appendRecentFact(context, line) {
  context.recentFacts.importantDiscoveries = appendLine(context.recentFacts.importantDiscoveries, line);
}

export function appendLine(existing, nextLine) {
  const clean = String(nextLine || "").trim();
  if (!clean) return String(existing || "");
  const current = String(existing || "").trim();
  if (!current) return clean;
  if (current.includes(clean)) return current;
  return `${current}\n${clean}`;
}

export function formatUpdateSummary(update) {
  const parts = [
    update.title || "Suggested update",
    update.target ? `Target: ${update.target}` : "",
    update.from || update.to ? `${update.from || "?"} → ${update.to || "?"}` : "",
    update.details || ""
  ].filter(Boolean);
  return parts.join(" — ");
}

export function findCharacterFromText(text, characterByName, characters = []) {
  const lower = String(text || "").toLowerCase();
  if (!lower) return null;
  for (const [name, character] of characterByName) {
    if (lower.includes(name)) return character;
  }
  return characters.find((character) => lower.includes(String(character.id).toLowerCase())) || null;
}

export function ensureCharacterState(castState, characterId) {
  let row = castState.activeCharacters.find((item) => item.characterId === characterId);
  if (!row) {
    row = { characterId, presence: "active", present: true, outfit: "", mood: "", condition: "", currentGoal: "", knowledge: "", temporarySecret: "", sceneInstruction: "" };
    castState.activeCharacters.push(row);
  }
  return row;
}

export function ensureRelationshipState(castState, characterId) {
  let row = castState.relationships.find((item) => item.characterId === characterId);
  if (!row) {
    row = { characterId, relationshipToUser: "", trustTensionNotes: "", promisesConflicts: "" };
    castState.relationships.push(row);
  }
  return row;
}

export function chooseActiveCastLead(story, storyCharacters = []) {
  if (!story || !storyCharacters.length) return storyCharacters[0] || null;
  const contextRows = Array.isArray(story.castState?.activeCharacters) ? story.castState.activeCharacters : [];
  const activeIds = contextRows
    .filter((row) => normalizeCastPresence(row.presence || (row.present === false ? "inactive" : "active")) === "active")
    .map((row) => row.characterId)
    .filter(Boolean);
  return activeIds.map((id) => storyCharacters.find((character) => character.id === id)).find(Boolean)
    || storyCharacters[0]
    || null;
}

export function loadInitialState() {
  const worlds = repository.worlds.list(defaultWorlds).map(normalizeWorld);
  const characters = repository.characters.list(defaultCharacters).map((character) => normalizeCharacter(character, worlds));
  const stories = repository.stories.list(defaultStories).map((story) => normalizeStory(story, worlds, characters));
  const storedStoryId = repository.activeStory.get();
  const activeStory = stories.find((story) => story.id === storedStoryId) || null;
  const activeStoryId = activeStory?.id || null;
  if (activeStoryId) repository.activeStory.set(activeStoryId);
  else repository.activeStory.clear();
  return {
    worlds, characters, stories, activeStoryId,
    activeView: activeStory ? "story" : "landing",
    selectedCharacterSheetId: chooseActiveCastLead(activeStory, getStoryCharactersFromLists(activeStory, characters))?.id || characters[0]?.id || "",
    selectedWorldSheetId: activeStory?.worldId || worlds[0]?.id || "",
    chatHistory: activeStory ? loadChatForStory(activeStory, worlds, characters) : [],
    activeLoreMemory: activeStory ? repository.loreMemory.load(activeStory.id, []) : []
  };
}

export function loadChatForStory(story, worlds, characters) {
  const saved = repository.chats.load(story?.id, null);
  if (Array.isArray(saved)) return saved.map(normalizeChatMessage);
  const world = worlds.find((item) => item.id === story.worldId) || worlds[0];
  const storyCharacters = getStoryCharactersFromLists(story, characters);
  const lead = chooseActiveCastLead(story, storyCharacters) || characters[0];
  if (!story || !world || !lead) return [];
  return [{ role: "assistant", content: buildOpeningMessage(story, lead, world, storyCharacters) }];
}

export function getStoryCharactersFromLists(story, characters) {
  const ids = Array.isArray(story?.characterIds) ? [...story.characterIds] : [];
  return uniqueCompact(ids.length ? ids : [story?.mainCharacterId])
    .map((id) => characters.find((character) => character.id === id))
    .filter(Boolean);
}

export function uniqueCompact(values) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

export function createAssistantReply(content) {
  return { role: "assistant", content, alternatives: [content], selectedIndex: 0 };
}

export function commitLastAssistantChoice(history) {
  const nextHistory = history.map((message) => ({ ...message }));
  const lastMessage = nextHistory[nextHistory.length - 1];
  if (!isAssistantMessageWithOptions(lastMessage)) return nextHistory;
  const selectedText = lastMessage.alternatives[lastMessage.selectedIndex] || lastMessage.content;
  lastMessage.content = selectedText;
  delete lastMessage.alternatives;
  delete lastMessage.selectedIndex;
  return nextHistory;
}

export function findLastAssistantIndex(history) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "assistant") return index;
  }
  return -1;
}

export function appendGeneratedReplyToLastAssistant(history, continuation) {
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

export function addAlternativeToLastAssistant(history, reply) {
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

export function parseSuggestedUpdates(rawText) {
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

export function normalizeSuggestedUpdate(update, index) {
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

export function validateIncomingCharacterBundle(character) {
  const issues = [];
  if (!character || typeof character !== "object") issues.push("Missing character object.");
  if (character && !String(character.name || "").trim()) issues.push("Character name is required.");
  const lorebook = character?.lorebook || character?.characterLorebook || [];
  if (lorebook && !Array.isArray(lorebook)) issues.push("Character lorebook must be an array when provided.");
  return { ok: issues.length === 0, issues };
}

export function validateIncomingWorldBundle(world) {
  const issues = [];
  if (!world || typeof world !== "object") issues.push("Missing world object.");
  if (world && !String(world.name || "").trim()) issues.push("World name is required.");
  const lorebook = world?.worldLorebook || world?.lorebook || [];
  if (lorebook && !Array.isArray(lorebook)) issues.push("World lorebook must be an array when provided.");
  if (world?.locations && !Array.isArray(world.locations)) issues.push("Locations must be an array when provided.");
  return { ok: issues.length === 0, issues };
}

export function validateStoryExportBundle(bundle) {
  const issues = [];
  if (!bundle.story) issues.push("Missing story data.");
  if (!bundle.world) issues.push("Missing world data.");
  if (!Array.isArray(bundle.characters) || bundle.characters.length === 0) issues.push("Missing character data.");
  if (bundle.story && !Array.isArray(bundle.story.storyLorebook)) issues.push("Story lorebook is missing or invalid.");
  if (bundle.world && !Array.isArray(bundle.world.worldLorebook)) issues.push("World lorebook is missing or invalid.");
  if (Array.isArray(bundle.characters)) {
    for (const character of bundle.characters) {
      if (!Array.isArray(character.lorebook)) issues.push(`Character lorebook is missing or invalid for ${character.name || character.id}.`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateIncomingStoryBundle(bundle) {
  if (!bundle || typeof bundle !== "object") return "Invalid story file. Could not find story bundle data.";
  if (!bundle.story || !bundle.world || !Array.isArray(bundle.characters)) return "Invalid story file. It must include story, world, and characters.";
  if (bundle.characters.length === 0) return "Invalid story file. It must include at least one character.";
  if (!bundle.world.name) return "Invalid story file. The world needs a name.";
  if (!bundle.characters.some((character) => character && character.name)) return "Invalid story file. At least one character needs a name.";
  return "";
}

export function hydrateBundleLore(bundle, storySource, worldSource, characterSources) {
  if (!bundle.completeLore) return;
  if (!Array.isArray(storySource.storyLorebook) && Array.isArray(bundle.completeLore.storyLorebook)) {
    storySource.storyLorebook = bundle.completeLore.storyLorebook;
  }
  if (!Array.isArray(worldSource.worldLorebook) && Array.isArray(bundle.completeLore.worldLorebook)) {
    worldSource.worldLorebook = bundle.completeLore.worldLorebook;
  }
  if (!Array.isArray(bundle.completeLore.characterLorebooks)) return;
  for (const character of characterSources) {
    const loreMatch = bundle.completeLore.characterLorebooks.find((entry) => entry.characterId === character.id);
    if (!Array.isArray(character.lorebook) && loreMatch) {
      character.lorebook = loreMatch.lorebook || [];
    }
  }
}

export function remapImportedContextCastIds(context, idMap) {
  if (!context || typeof context !== "object") return context;
  return { ...context, activeCharacters: remapCastRows(context.activeCharacters, idMap), relationships: remapCastRows(context.relationships, idMap) };
}

export function remapImportedCastStateIds(castState, idMap) {
  if (!castState || typeof castState !== "object") return castState;
  return { ...castState, activeCharacters: remapCastRows(castState.activeCharacters, idMap), relationships: remapCastRows(castState.relationships, idMap) };
}

export function remapCastRows(rows, idMap) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const oldId = row.characterId || row.id;
    return { ...row, characterId: idMap[oldId] || oldId };
  });
}

export function buildStoryExportBundle(story, getWorld, getStoryCharacters, chatHistory, activeStoryId) {
  const world = getWorld(story.worldId);
  const storyCharacters = getStoryCharacters(story);
  return {
    type: "roleplay-story-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    story: cloneJson(story),
    world: cloneJson(world),
    characters: cloneJson(storyCharacters),
    completeLore: {
      storyLorebook: cloneJson(story.storyLorebook || []),
      worldLorebook: cloneJson(world?.worldLorebook || []),
      characterLorebooks: storyCharacters.map((character) => ({ characterId: character.id, characterName: character.name, lorebook: cloneJson(character.lorebook || []) }))
    },
    chatHistory: story.id === activeStoryId ? cloneJson(chatHistory) : cloneJson(loadChatForStory(story, [world].filter(Boolean), storyCharacters))
  };
}

