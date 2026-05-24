import { LORE_SCAN_MESSAGES, MAX_ACTIVE_LORE, MAX_LORE_PROMPT_CHARS } from "../constants/defaultData.js";
import { normalizeStoredLorebook } from "./normalizers.js";

export function normalizeLoreMatchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDirectorNotesPrompt(notes) {
  const lines = [
    ["Time of Day", notes?.timeOfDay],
    ["Current Location", notes?.currentLocation],
    ["Scene Mood", notes?.sceneMood],
    ["Character Motivation", notes?.characterMotivation],
    ["User's Plan", notes?.userPlan],
    ["Current Conflict", notes?.currentConflict],
    ["Next Story Beat", notes?.nextStoryBeat],
    ["Avoid / Do Not Reveal Yet", notes?.avoid],
    ["Custom Notes", notes?.customNotes]
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}:\n${String(value).trim()}`);

  return lines.join("\n\n");
}

export function getRecentLoreTriggerText(history, directorNotes) {
  const recentChatText = (history || [])
    .slice(-LORE_SCAN_MESSAGES)
    .map((message) => message?.content || "")
    .join("\n");

  return normalizeLoreMatchText(`${recentChatText}\n${buildDirectorNotesPrompt(directorNotes)}`);
}

export function getCombinedRuntimeLorebook({ story, world, character, characters = [] }) {
  const temporaryLore = normalizeRuntimeLorebook(story?.temporaryLorebook || [], "Temporary", story?.id || "temporary");
  const storyLore = normalizeRuntimeLorebook(story?.storyLorebook || [], "Story", story?.id || "story");
  const worldLore = normalizeRuntimeLorebook(world?.worldLorebook || [], "World", world?.id || "world");
  const cast = uniqueCharacters(characters, character);
  const characterLore = cast.flatMap((castCharacter) => {
    return normalizeRuntimeLorebook(
      castCharacter?.lorebook || [],
      `Character: ${castCharacter?.name || "Unnamed"}`,
      castCharacter?.id || "character"
    );
  });
  return [...temporaryLore, ...storyLore, ...worldLore, ...characterLore];
}

export function normalizeRuntimeLorebook(lorebook, source, sourceId) {
  return normalizeStoredLorebook(lorebook).map((entry, index) => ({
    ...entry,
    id: makeLoreRuntimeId(entry, source, sourceId, index),
    source,
    sourceId,
    sourceKey: source.toLowerCase(),
    originalIndex: index
  }));
}

export function makeLoreRuntimeId(entry, source, sourceId, index) {
  if (entry.id) return `${source}:${sourceId}:${entry.id}`;
  const base = entry.name || entry.keywords?.[0] || `lore-${index}`;
  return `${source}:${sourceId}:${base}`
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-");
}

export function inspectLoreInjection({ story, world, character, characters = [], history, activeLoreMemory }) {
  const triggerText = getRecentLoreTriggerText(history, story?.directorNotes);
  const combinedLorebook = getCombinedRuntimeLorebook({ story, world, character, characters });

  const inspectedEntries = combinedLorebook.map((entry) => ({
    ...entry,
    debug: explainLoreEntryMatch(entry, triggerText)
  }));

  const matchingEntries = inspectedEntries
    .filter((entry) => entry.debug.matched)
    .filter((entry) => String(entry.content || "").trim());

  const nextMemory = buildNextActiveLoreMemory(activeLoreMemory, matchingEntries, combinedLorebook);
  const selectedEntries = selectLoreForPrompt(nextMemory);

  return {
    triggerText,
    combinedLorebook,
    inspectedEntries,
    matchingEntries,
    nextMemory,
    selectedEntries,
    injectedText: formatLoreForPrompt(selectedEntries),
    usedChars: formatLoreForPrompt(selectedEntries).length,
    maxChars: MAX_LORE_PROMPT_CHARS
  };
}

export function explainLoreEntryMatch(entry, triggerText) {
  if (!entry.enabled) {
    return {
      matched: false,
      status: "disabled",
      reason: "Disabled lore is ignored.",
      matchedKeywords: []
    };
  }

  if (entry.alwaysOn) {
    return {
      matched: true,
      status: "always-on",
      reason: "Always on.",
      matchedKeywords: []
    };
  }

  if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
    return {
      matched: false,
      status: "no-keywords",
      reason: "No keywords and not always on.",
      matchedKeywords: []
    };
  }

  const matchedKeywords = entry.keywords.filter((keyword) => loreKeywordMatches(keyword, triggerText));

  if (matchedKeywords.length > 0) {
    return {
      matched: true,
      status: "keyword-match",
      reason: `Matched keyword: ${matchedKeywords.join(", ")}`,
      matchedKeywords
    };
  }

  return {
    matched: false,
    status: "not-triggered",
    reason: "No keywords matched recent chat or Director Notes.",
    matchedKeywords: []
  };
}

export function loreKeywordMatches(keyword, triggerText) {
  const cleanKeyword = normalizeLoreMatchText(keyword);
  if (!cleanKeyword || !triggerText) return false;
  if (cleanKeyword.includes(" ")) return triggerText.includes(cleanKeyword);

  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(triggerText);
}

export function buildNextActiveLoreMemory(currentMemory, newEntries, combinedLorebook) {
  const currentById = new Map();

  for (const entry of currentMemory || []) {
    if (entry?.id) currentById.set(entry.id, entry);
  }

  const now = Date.now();
  for (const entry of newEntries || []) {
    currentById.set(entry.id, {
      id: entry.id,
      source: entry.source,
      sourceKey: entry.sourceKey,
      sourceId: entry.sourceId,
      originalIndex: entry.originalIndex,
      name: entry.name,
      keywords: entry.keywords,
      content: entry.content,
      enabled: entry.enabled,
      alwaysOn: entry.alwaysOn,
      priority: Number(entry.priority || 0),
      triggeredAt: now
    });
  }

  const validIds = new Set(
    (combinedLorebook || [])
      .filter((entry) => entry.enabled)
      .map((entry) => entry.id)
  );

  return Array.from(currentById.values())
    .filter((entry) => validIds.has(entry.id))
    .filter((entry) => String(entry.content || "").trim())
    .sort(sortLoreEntries)
    .slice(0, MAX_ACTIVE_LORE);
}

export function pruneActiveLoreMemory(currentMemory, combinedLorebook) {
  const validIds = new Set(
    (combinedLorebook || [])
      .filter((entry) => entry.enabled)
      .map((entry) => entry.id)
  );

  return (currentMemory || []).filter((entry) => validIds.has(entry.id));
}

export function selectLoreForPrompt(entries) {
  let usedChars = 0;
  const selected = [];
  const sortedEntries = [...(entries || [])].sort(sortLoreEntries);

  for (const entry of sortedEntries) {
    const formatted = formatSingleLoreEntry(entry);
    const nextLength = formatted.length + 2;

    if (selected.length > 0 && usedChars + nextLength > MAX_LORE_PROMPT_CHARS) {
      continue;
    }

    selected.push(entry);
    usedChars += nextLength;

    if (selected.length >= MAX_ACTIVE_LORE) break;
  }

  return selected;
}

export function sortLoreEntries(a, b) {
  const alwaysOnDiff = Number(b.alwaysOn === true) - Number(a.alwaysOn === true);
  if (alwaysOnDiff !== 0) return alwaysOnDiff;

  const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
  if (priorityDiff !== 0) return priorityDiff;

  return Number(b.triggeredAt || 0) - Number(a.triggeredAt || 0);
}

export function formatLoreForPrompt(entries) {
  return (entries || []).map(formatSingleLoreEntry).filter(Boolean).join("\n\n");
}

export function formatSingleLoreEntry(entry) {
  if (!entry || !entry.content) return "";
  return `[${entry.source}] ${entry.name}\n${String(entry.content).trim()}`;
}

function uniqueCharacters(characters = [], fallbackCharacter = null) {
  const byId = new Map();
  for (const character of characters || []) {
    if (character?.id && !byId.has(character.id)) byId.set(character.id, character);
  }
  if (fallbackCharacter?.id && !byId.has(fallbackCharacter.id)) byId.set(fallbackCharacter.id, fallbackCharacter);
  return Array.from(byId.values()).filter(Boolean);
}
