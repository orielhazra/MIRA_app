import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useStoryWorldActions from "../src/hooks/useStoryWorldActions";
import { createAppFixtures } from "./testFixtures";

describe("useStoryWorldActions", () => {
  it("updateStoryWorldPatch merges world-level overlay fields", () => {
    const { stories } = createAppFixtures();
    const saveActiveStory = vi.fn();
    const { result } = renderHook(() => useStoryWorldActions());

    act(() => {
      result.current.updateStoryWorldPatch({
        activeStory: stories[0] as any,
        saveActiveStory,
        patch: { shortDescription: "Story-specific summary", rules: "Only the brave walk here." },
      });
    });

    expect(saveActiveStory).toHaveBeenCalledWith(expect.objectContaining({
      worldOverlay: expect.objectContaining({
        worldPatch: expect.objectContaining({
          shortDescription: "Story-specific summary",
          rules: "Only the brave walk here.",
        }),
      }),
    }));
  });

  it("updateStoryWorldLocation stores template-location overrides and syncs current context by locationId", () => {
    const { worlds, stories } = createAppFixtures();
    const activeStory = {
      ...stories[0],
      currentContext: {
        ...stories[0].currentContext,
        location: {
          ...stories[0].currentContext.location,
          locationId: "loc_square",
          name: "Market Square",
          description: "Crowded and bright.",
        },
      },
    } as any;
    const activeWorld = {
      ...worlds[0],
      locations: [{ id: "loc_square", name: "Market Square", description: "Crowded and bright.", hazards: "None" }],
    } as any;
    const saveActiveStory = vi.fn();
    const { result } = renderHook(() => useStoryWorldActions());

    act(() => {
      result.current.updateStoryWorldLocation({
        activeStory,
        activeWorld,
        saveActiveStory,
        locationId: "loc_square",
        patch: { name: "Ashen Square", hazards: "Falling cinders" },
      });
    });

    const updatedStory = saveActiveStory.mock.calls[0][0];
    expect(updatedStory.worldOverlay.modifiedLocations).toMatchObject({
      loc_square: {
        name: "Ashen Square",
        hazards: "Falling cinders",
      },
    });
    expect(updatedStory.currentContext.location).toMatchObject({
      locationId: "loc_square",
      name: "Ashen Square",
      hazards: "Falling cinders",
    });
  });

  it("add and remove story-only locations update overlay collections", () => {
    const { stories } = createAppFixtures();
    const saveActiveStory = vi.fn();
    const { result } = renderHook(() => useStoryWorldActions());

    act(() => {
      result.current.addStoryWorldLocation({
        activeStory: stories[0] as any,
        saveActiveStory,
        location: { id: "loc_tunnel", name: "Hidden Tunnel", description: "Narrow and damp." },
      });
    });

    const storyWithAddedLocation = saveActiveStory.mock.calls[0][0];
    expect(storyWithAddedLocation.worldOverlay.addedLocations).toEqual([
      expect.objectContaining({ id: "loc_tunnel", name: "Hidden Tunnel" }),
    ]);

    act(() => {
      result.current.removeStoryWorldLocation({
        activeStory: storyWithAddedLocation,
        saveActiveStory,
        locationId: "loc_tunnel",
      });
    });

    const storyAfterRemoval = saveActiveStory.mock.calls[1][0];
    expect(storyAfterRemoval.worldOverlay.addedLocations).toEqual([]);
    expect(storyAfterRemoval.worldOverlay.removedLocationIds).toEqual([]);
  });

  it("add, update, and remove story-world lore entries through the overlay", () => {
    const { stories } = createAppFixtures();
    const saveActiveStory = vi.fn();
    const { result } = renderHook(() => useStoryWorldActions());

    act(() => {
      result.current.addStoryWorldLoreEntry({
        activeStory: stories[0] as any,
        saveActiveStory,
        loreEntry: { id: "lore_secret", name: "Secret Routes", keywords: ["route"], content: "Only smugglers know them." },
      });
    });

    const storyWithAddedLore = saveActiveStory.mock.calls[0][0];
    expect(storyWithAddedLore.worldOverlay.addedLoreEntries).toEqual([
      expect.objectContaining({ id: "lore_secret", name: "Secret Routes" }),
    ]);

    act(() => {
      result.current.updateStoryWorldLoreEntry({
        activeStory: storyWithAddedLore,
        saveActiveStory,
        entryId: "lore_secret",
        patch: { content: "Only the city smugglers know them." },
      });
    });

    const storyWithUpdatedLore = saveActiveStory.mock.calls[1][0];
    expect(storyWithUpdatedLore.worldOverlay.addedLoreEntries[0]).toMatchObject({
      id: "lore_secret",
      content: "Only the city smugglers know them.",
    });

    act(() => {
      result.current.removeStoryWorldLoreEntry({
        activeStory: storyWithUpdatedLore,
        saveActiveStory,
        entryId: "lore_secret",
      });
    });

    const storyAfterRemoval = saveActiveStory.mock.calls[2][0];
    expect(storyAfterRemoval.worldOverlay.addedLoreEntries).toEqual([]);
    expect(storyAfterRemoval.worldOverlay.removedLoreEntryIds).toEqual([]);
  });

  it("resetStoryWorldOverlay clears all overlay customizations", () => {
    const { stories } = createAppFixtures();
    const activeStory = {
      ...stories[0],
      worldOverlay: {
        worldPatch: { shortDescription: "Changed" },
        modifiedLocations: { loc_square: { name: "Changed Square" } },
        addedLocations: [{ id: "loc_tunnel", name: "Tunnel" }],
        removedLocationIds: ["loc_keep"],
        modifiedLoreEntries: { lore_bells: { content: "Changed" } },
        addedLoreEntries: [{ id: "lore_secret", name: "Secret", keywords: [], content: "x", enabled: true, alwaysOn: false }],
        removedLoreEntryIds: ["lore_masks"],
      },
    } as any;
    const saveActiveStory = vi.fn();
    const { result } = renderHook(() => useStoryWorldActions());

    act(() => {
      result.current.resetStoryWorldOverlay({
        activeStory,
        saveActiveStory,
      });
    });

    expect(saveActiveStory).toHaveBeenCalledWith(expect.objectContaining({
      worldOverlay: {
        worldPatch: {},
        modifiedLocations: {},
        addedLocations: [],
        removedLocationIds: [],
        modifiedLoreEntries: {},
        addedLoreEntries: [],
        removedLoreEntryIds: [],
      },
    }));
  });
});
