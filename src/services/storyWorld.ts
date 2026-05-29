import { createEmptyStoryWorldOverlay } from "../constants/defaultData";
import { LoreEntry, Story, StoryWorldOverlay, World, WorldLocation } from "../types";
import {
  normalizeStoredLorebook,
  normalizeStoryWorldOverlay,
  normalizeWorld,
  normalizeWorldLocations,
} from "./normalizers";

export function createEmptyWorldOverlay(): StoryWorldOverlay {
  return normalizeStoryWorldOverlay(createEmptyStoryWorldOverlay());
}

export function getTemplateWorldById(templateWorldId: string, worlds: World[] = []): World | null {
  if (!templateWorldId) return null;
  const match = (worlds || []).find((world) => world?.id === templateWorldId);
  return match ? normalizeWorld(match) : null;
}

export function getLatestTemplateByKey(templateKey: string, worlds: World[] = []): World | null {
  if (!templateKey) return null;
  const candidates = (worlds || [])
    .filter((world) => String(world?.templateKey || "") === templateKey)
    .map((world) => normalizeWorld(world));

  if (!candidates.length) return null;

  return candidates.sort((a, b) => {
    const versionDiff = Number(b.templateVersion || 0) - Number(a.templateVersion || 0);
    if (versionDiff !== 0) return versionDiff;
    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  })[0];
}


export function getLatestTemplateWorlds(worlds: World[] = []): World[] {
  const latestByTemplateKey = new Map<string, World>();
  for (const world of (worlds || []).map((item) => normalizeWorld(item))) {
    const templateKey = String(world.templateKey || world.id || "");
    const existing = latestByTemplateKey.get(templateKey);
    if (!existing) {
      latestByTemplateKey.set(templateKey, world);
      continue;
    }
    const versionDiff = Number(world.templateVersion || 0) - Number(existing.templateVersion || 0);
    if (versionDiff > 0 || (versionDiff === 0 && Number(world.createdAt || 0) > Number(existing.createdAt || 0))) {
      latestByTemplateKey.set(templateKey, world);
    }
  }
  return Array.from(latestByTemplateKey.values());
}


export function getTemplateWorldByKeyAndVersion(templateKey: string, templateVersion: number, worlds: World[] = []): World | null {
  if (!templateKey) return null;
  const match = (worlds || [])
    .map((world) => normalizeWorld(world))
    .find((world) => String(world.templateKey || "") === String(templateKey) && Number(world.templateVersion || 1) === Number(templateVersion || 1));
  return match || null;
}

export function applyWorldOverlay(baseWorld: World | null, overlay?: StoryWorldOverlay | null): World | null {
  if (!baseWorld) return null;

  const normalizedBaseWorld = normalizeWorld(baseWorld);
  const normalizedOverlay = normalizeStoryWorldOverlay(overlay || createEmptyWorldOverlay());

  const mergedWorld = normalizeWorld({
    ...normalizedBaseWorld,
    ...normalizedOverlay.worldPatch,
    locations: mergeLocations(normalizedBaseWorld.locations || [], normalizedOverlay),
    worldLorebook: mergeLoreEntries(normalizedBaseWorld.worldLorebook || [], normalizedOverlay),
  });

  return {
    ...mergedWorld,
    id: normalizedBaseWorld.id,
    templateKey: normalizedBaseWorld.templateKey,
    templateVersion: normalizedBaseWorld.templateVersion,
    createdAt: normalizedBaseWorld.createdAt,
  };
}

export function resolveEffectiveWorld(story: Story | null, worlds: World[] = []): World | null {
  if (!story) return null;
  const fallbackWorld = worlds?.[0] ? normalizeWorld(worlds[0]) : null;
  const baseWorld = getTemplateWorldById(story.templateWorldId, worlds)
    || getLatestTemplateByKey(String(story.templateWorldKey || ""), worlds)
    || fallbackWorld;
  if (!baseWorld) return null;
  return applyWorldOverlay(baseWorld, story.worldOverlay);
}

function mergeLocations(baseLocations: WorldLocation[] = [], overlay: StoryWorldOverlay): WorldLocation[] {
  const removedIds = new Set((overlay.removedLocationIds || []).map(String));
  const modifiedById = overlay.modifiedLocations || {};
  const merged: WorldLocation[] = [];

  for (const location of normalizeWorldLocations(baseLocations)) {
    if (removedIds.has(location.id)) continue;
    const patch = modifiedById[location.id] || {};
    merged.push({ ...location, ...patch, id: location.id });
  }

  for (const location of normalizeWorldLocations(overlay.addedLocations || [])) {
    const existingIndex = merged.findIndex((entry) => entry.id === location.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = location;
    } else {
      merged.push(location);
    }
  }

  return normalizeWorldLocations(merged);
}

function mergeLoreEntries(baseLoreEntries: LoreEntry[] = [], overlay: StoryWorldOverlay): LoreEntry[] {
  const removedIds = new Set((overlay.removedLoreEntryIds || []).map(String));
  const modifiedById = overlay.modifiedLoreEntries || {};
  const merged: LoreEntry[] = [];

  for (const entry of normalizeStoredLorebook(baseLoreEntries)) {
    if (removedIds.has(entry.id || "")) continue;
    const patch = modifiedById[entry.id || ""] || {};
    merged.push({ ...entry, ...patch, id: entry.id });
  }

  for (const entry of normalizeStoredLorebook(overlay.addedLoreEntries || [])) {
    const existingIndex = merged.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = entry;
    } else {
      merged.push(entry);
    }
  }

  return normalizeStoredLorebook(merged);
}
