import { Story, StoryWorldOverlay, World, WorldLocation, LoreEntry, CurrentContext } from "../types";
import { normalizeStoredLorebook, normalizeStoryWorldOverlay, normalizeWorldLocations } from "../services/normalizers";
import { createEmptyWorldOverlay, getLatestTemplateByKey } from "../services/storyWorld";
import { createId } from "../utils/helpers";

interface StoryWorldActionDeps {
  activeStory?: Story | null;
  activeWorld?: World | null;
  saveActiveStory?: (story: Story) => void;
  patch?: any;
  location?: Partial<WorldLocation>;
  locationId?: string;
  loreEntry?: Partial<LoreEntry>;
  entryId?: string;
  worlds?: World[];
}

export default function useStoryWorldActions() {
  function updateStoryWorldPatch({ activeStory, saveActiveStory, patch }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory) return;
    const overlay = getOverlay(activeStory);
    const nextOverlay = normalizeStoryWorldOverlay({
      ...overlay,
      worldPatch: {
        ...overlay.worldPatch,
        ...(patch && typeof patch === "object" ? patch : {}),
      },
    });
    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay });
  }

  function addStoryWorldLocation({ activeStory, saveActiveStory, location }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory) return;
    const overlay = getOverlay(activeStory);
    const normalizedLocation = normalizeWorldLocations([
      {
        id: location?.id || createId("location"),
        name: location?.name || "New Story Location",
        summary: location?.summary || "",
        description: location?.description || "",
        mood: location?.mood || "",
        visibleExits: location?.visibleExits || "",
        hazards: location?.hazards || "",
        connectedTo: location?.connectedTo || "",
        keywords: location?.keywords || [],
      },
    ])[0];

    const existingIndex = overlay.addedLocations.findIndex((entry) => entry.id === normalizedLocation.id);
    const nextAddedLocations = existingIndex >= 0
      ? overlay.addedLocations.map((entry, index) => (index === existingIndex ? normalizedLocation : entry))
      : [...overlay.addedLocations, normalizedLocation];

    const nextOverlay = normalizeStoryWorldOverlay({
      ...overlay,
      addedLocations: nextAddedLocations,
      removedLocationIds: overlay.removedLocationIds.filter((id) => id !== normalizedLocation.id),
    });

    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay });
  }

  function updateStoryWorldLocation({ activeStory, activeWorld, saveActiveStory, locationId, patch }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory || !locationId) return;
    const overlay = getOverlay(activeStory);
    const addedIndex = overlay.addedLocations.findIndex((entry) => entry.id === locationId);

    let nextOverlay: StoryWorldOverlay;
    let nextContext = activeStory.currentContext;

    if (addedIndex >= 0) {
      const updatedLocation = normalizeWorldLocations([
        { ...overlay.addedLocations[addedIndex], ...(patch && typeof patch === "object" ? patch : {}), id: locationId },
      ])[0];
      nextOverlay = normalizeStoryWorldOverlay({
        ...overlay,
        addedLocations: overlay.addedLocations.map((entry, index) => (index === addedIndex ? updatedLocation : entry)),
        removedLocationIds: overlay.removedLocationIds.filter((id) => id !== locationId),
      });
      nextContext = syncCurrentContextLocation(activeStory.currentContext, updatedLocation);
    } else {
      const baseLocation = activeWorld?.locations?.find((entry) => entry.id === locationId) || null;
      const updatedLocation = baseLocation ? { ...baseLocation, ...(patch && typeof patch === "object" ? patch : {}), id: locationId } : null;
      nextOverlay = normalizeStoryWorldOverlay({
        ...overlay,
        modifiedLocations: {
          ...overlay.modifiedLocations,
          [locationId]: {
            ...(overlay.modifiedLocations[locationId] || {}),
            ...(patch && typeof patch === "object" ? patch : {}),
          },
        },
        removedLocationIds: overlay.removedLocationIds.filter((id) => id !== locationId),
      });
      nextContext = updatedLocation ? syncCurrentContextLocation(activeStory.currentContext, updatedLocation) : activeStory.currentContext;
    }

    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay, currentContext: nextContext });
  }

  function removeStoryWorldLocation({ activeStory, saveActiveStory, locationId }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory || !locationId) return;
    const overlay = getOverlay(activeStory);
    const wasAddedLocation = overlay.addedLocations.some((entry) => entry.id === locationId);

    const nextOverlay = normalizeStoryWorldOverlay({
      ...overlay,
      addedLocations: overlay.addedLocations.filter((entry) => entry.id !== locationId),
      modifiedLocations: Object.fromEntries(
        Object.entries(overlay.modifiedLocations).filter(([id]) => id !== locationId)
      ),
      removedLocationIds: wasAddedLocation
        ? overlay.removedLocationIds.filter((id) => id !== locationId)
        : uniqueCompact([...overlay.removedLocationIds, locationId]),
    });

    const nextContext = activeStory.currentContext?.location?.locationId === locationId
      ? clearCurrentContextLocation(activeStory.currentContext)
      : activeStory.currentContext;

    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay, currentContext: nextContext });
  }

  function addStoryWorldLoreEntry({ activeStory, saveActiveStory, loreEntry }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory) return;
    const overlay = getOverlay(activeStory);
    const normalizedEntry = normalizeStoredLorebook([
      {
        id: loreEntry?.id || createId("lore"),
        name: loreEntry?.name || "New Story World Lore",
        keywords: loreEntry?.keywords || [],
        content: loreEntry?.content || "",
        enabled: loreEntry?.enabled !== false,
        alwaysOn: loreEntry?.alwaysOn === true,
        priority: loreEntry?.priority || 0,
      },
    ])[0];

    const existingIndex = overlay.addedLoreEntries.findIndex((entry) => entry.id === normalizedEntry.id);
    const nextAddedLoreEntries = existingIndex >= 0
      ? overlay.addedLoreEntries.map((entry, index) => (index === existingIndex ? normalizedEntry : entry))
      : [...overlay.addedLoreEntries, normalizedEntry];

    const nextOverlay = normalizeStoryWorldOverlay({
      ...overlay,
      addedLoreEntries: nextAddedLoreEntries,
      removedLoreEntryIds: overlay.removedLoreEntryIds.filter((id) => id !== normalizedEntry.id),
    });

    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay });
  }

  function updateStoryWorldLoreEntry({ activeStory, saveActiveStory, entryId, patch }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory || !entryId) return;
    const overlay = getOverlay(activeStory);
    const addedIndex = overlay.addedLoreEntries.findIndex((entry) => entry.id === entryId);

    let nextOverlay: StoryWorldOverlay;

    if (addedIndex >= 0) {
      const updatedEntry = normalizeStoredLorebook([
        { ...overlay.addedLoreEntries[addedIndex], ...(patch && typeof patch === "object" ? patch : {}), id: entryId },
      ])[0];
      nextOverlay = normalizeStoryWorldOverlay({
        ...overlay,
        addedLoreEntries: overlay.addedLoreEntries.map((entry, index) => (index === addedIndex ? updatedEntry : entry)),
        removedLoreEntryIds: overlay.removedLoreEntryIds.filter((id) => id !== entryId),
      });
    } else {
      nextOverlay = normalizeStoryWorldOverlay({
        ...overlay,
        modifiedLoreEntries: {
          ...overlay.modifiedLoreEntries,
          [entryId]: {
            ...(overlay.modifiedLoreEntries[entryId] || {}),
            ...(patch && typeof patch === "object" ? patch : {}),
          },
        },
        removedLoreEntryIds: overlay.removedLoreEntryIds.filter((id) => id !== entryId),
      });
    }

    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay });
  }

  function removeStoryWorldLoreEntry({ activeStory, saveActiveStory, entryId }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory || !entryId) return;
    const overlay = getOverlay(activeStory);
    const wasAddedEntry = overlay.addedLoreEntries.some((entry) => entry.id === entryId);

    const nextOverlay = normalizeStoryWorldOverlay({
      ...overlay,
      addedLoreEntries: overlay.addedLoreEntries.filter((entry) => entry.id !== entryId),
      modifiedLoreEntries: Object.fromEntries(
        Object.entries(overlay.modifiedLoreEntries).filter(([id]) => id !== entryId)
      ),
      removedLoreEntryIds: wasAddedEntry
        ? overlay.removedLoreEntryIds.filter((id) => id !== entryId)
        : uniqueCompact([...overlay.removedLoreEntryIds, entryId]),
    });

    saveActiveStory({ ...activeStory, worldOverlay: nextOverlay });
  }

  function resetStoryWorldOverlay({ activeStory, saveActiveStory }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory) return;
    saveActiveStory({ ...activeStory, worldOverlay: createEmptyWorldOverlay() });
  }

  function upgradeStoryWorldTemplate({ activeStory, saveActiveStory, worlds = [] }: StoryWorldActionDeps) {
    if (!activeStory || !saveActiveStory) return;
    const templateKey = activeStory.templateWorldKey || activeStory.templateWorldId;
    const latest = getLatestTemplateByKey(templateKey, worlds);
    
    if (!latest) return alert("Latest template version not found.");
    if (latest.id === activeStory.templateWorldId) return alert("Already using the latest version.");

    saveActiveStory({
      ...activeStory,
      templateWorldId: latest.id,
      templateWorldKey: latest.templateKey || latest.id,
      templateWorldVersion: latest.templateVersion || 1,
    });
  }

  return {
    updateStoryWorldPatch,
    addStoryWorldLocation,
    updateStoryWorldLocation,
    removeStoryWorldLocation,
    addStoryWorldLoreEntry,
    updateStoryWorldLoreEntry,
    removeStoryWorldLoreEntry,
    resetStoryWorldOverlay,
    upgradeStoryWorldTemplate,
  };
}

function getOverlay(story: Story): StoryWorldOverlay {
  return normalizeStoryWorldOverlay(story.worldOverlay || createEmptyWorldOverlay());
}

function syncCurrentContextLocation(currentContext: CurrentContext, location: Partial<WorldLocation>): CurrentContext {
  if (currentContext?.location?.locationId !== location.id) return currentContext;
  return {
    ...currentContext,
    location: {
      ...currentContext.location,
      locationId: String(location.id || currentContext.location?.locationId || ""),
      name: String(location.name || currentContext.location?.name || ""),
      description: String(location.description || currentContext.location?.description || ""),
      visibleExits: String(location.visibleExits || currentContext.location?.visibleExits || ""),
      hazards: String(location.hazards || currentContext.location?.hazards || ""),
    },
  };
}

function clearCurrentContextLocation(currentContext: CurrentContext): CurrentContext {
  return {
    ...currentContext,
    location: {
      ...currentContext.location,
      locationId: "",
      name: "",
      description: "",
      visibleExits: "",
      hazards: "",
    },
  };
}

function uniqueCompact(values: string[]): string[] {
  return [...new Set((values || []).map(String).filter(Boolean))];
}
