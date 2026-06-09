import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRepository } = vi.hoisted(() => {
  const repository = {
    chats: {
      load: vi.fn(),
      save: vi.fn(),
    },
    loreMemory: {
      load: vi.fn(),
      save: vi.fn(),
    },
    activeStory: {
      set: vi.fn(),
    },
    stories: {
      loadFull: vi.fn(),
      saveStory: vi.fn(),
      deleteStory: vi.fn(),
    },
  };

  return { mockRepository: repository };
});

vi.mock("../src/services/repository", () => ({
  repository: mockRepository,
  isTauri: false,
}));

import useStoryActions from "../src/hooks/useStoryActions";
import { createAppFixtures, TestProviders } from "./testFixtures";

describe("useStoryActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("switchStory falls back to opening message if saved chat load fails", async () => {
    const { worlds, characters, stories } = createAppFixtures();
    const setActiveStory = vi.fn();
    const saveActiveStory = vi.fn();
    const setChatHistory = vi.fn();
    const setActiveLoreMemory = vi.fn();
    const setSelectedCharacterSheetId = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setStoryDraft = vi.fn();
    const setActiveView = vi.fn();

    mockRepository.stories.loadFull.mockReturnValue(stories[1]);
    mockRepository.chats.load.mockImplementation(() => {
      throw new Error("chat load failed");
    });
    mockRepository.loreMemory.load.mockReturnValue([{ id: "l1", name: "Lore", keywords: [], content: "x", enabled: true, alwaysOn: false }]);

    const { result } = renderHook(() => useStoryActions(), { wrapper: TestProviders });

    await act(async () => {
      await result.current.switchStory({
        storyId: "story-2",
        isGenerating: false,
        worlds,
        characters,
        setActiveStory,
        saveActiveStory,
        setChatHistory,
        setActiveLoreMemory,
        repository: mockRepository,
        setSelectedCharacterSheetId,
        setSelectedWorldSheetId,
        setStoryDraft,
        setActiveView,
      });
    });

    expect(setActiveStory).toHaveBeenCalledWith(expect.objectContaining({ id: "story-2" }));
    expect(saveActiveStory).toHaveBeenCalledWith(expect.objectContaining({ id: "story-2" }));
    expect(mockRepository.activeStory.set).toHaveBeenCalledWith("story-2");
    expect(console.error).toHaveBeenCalled();
    expect(setChatHistory).toHaveBeenCalledWith([{ role: "assistant", content: "Opening two" }]);
    expect(setActiveLoreMemory).toHaveBeenCalledWith([
      { id: "l1", name: "Lore", keywords: [], content: "x", enabled: true, alwaysOn: false },
    ]);
    
    // selected character ID should now be the castMemberId ("cast-2" in fixtures)
    expect(setSelectedCharacterSheetId).toHaveBeenCalledWith("cast-2");
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith("world-2");
    expect(setStoryDraft).toHaveBeenCalledWith(null);
    expect(setActiveView).toHaveBeenCalledWith("story");
  });


  it("startStoryFromCreationSheet pins template metadata and creates an empty world overlay", () => {
    const { worlds, characters } = createAppFixtures();
    const saveActiveStory = vi.fn();
    const setActiveStory = vi.fn();
    const setChatHistory = vi.fn();
    const setActiveLoreMemory = vi.fn();
    const setSelectedCharacterSheetId = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setStoryDraft = vi.fn();
    const setActiveView = vi.fn();

    const targetWorld = { ...worlds[1], templateKey: "world-two", templateVersion: 3 } as any;
    const { result } = renderHook(() => useStoryActions(), { wrapper: TestProviders });

    act(() => {
      result.current.startStoryFromCreationSheet({
        draft: {
          title: "Overlay Story",
          templateWorldId: targetWorld.id,
          templateWorldKey: targetWorld.templateKey,
          templateWorldVersion: targetWorld.templateVersion,
          characterIds: [characters[1].id],
          scenario: "Scene setup",
          greeting: "Opening greeting",
          storyLorebook: [],
        },
        worlds: [worlds[0], targetWorld],
        characters,
        saveActiveStory,
        setActiveStory,
        repository: mockRepository,
        setChatHistory,
        setActiveLoreMemory,
        setSelectedCharacterSheetId,
        setSelectedWorldSheetId,
        setStoryDraft,
        setActiveView,
      });
    });

    const createdStory = saveActiveStory.mock.calls[0][0];
    expect(createdStory).toMatchObject({
      title: "Overlay Story",
      templateWorldId: targetWorld.id,
      templateWorldKey: "world-two",
      templateWorldVersion: 3,
    });
    expect(createdStory.worldOverlay).toEqual({
      worldPatch: {},
      modifiedLocations: {},
      addedLocations: [],
      removedLocationIds: [],
      modifiedLoreEntries: {},
      addedLoreEntries: [],
      removedLoreEntryIds: [],
    });
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(targetWorld.id);
    expect(setActiveView).toHaveBeenCalledWith("story");
  });

  it("assignWorldToStory re-bases the story on a template and resets the overlay", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const saveActiveStory = vi.fn();
    const resetCurrentStoryState = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setActiveView = vi.fn();

    const targetWorld = { ...worlds[1], templateKey: "world-two", templateVersion: 5 } as any;
    const activeStory = {
      ...stories[0],
      templateWorldId: worlds[0].id,
      templateWorldKey: worlds[0].templateKey,
      templateWorldVersion: worlds[0].templateVersion,
      worldOverlay: {
        worldPatch: { shortDescription: "Modified story world" },
        modifiedLocations: {},
        addedLocations: [],
        removedLocationIds: [],
        modifiedLoreEntries: {},
        addedLoreEntries: [],
        removedLoreEntryIds: [],
      },
    } as any;

    const { result } = renderHook(() => useStoryActions(), { wrapper: TestProviders });

    act(() => {
      result.current.assignWorldToStory({
        worldId: targetWorld.id,
        activeStory,
        characters,
        getWorld: (id: string) => [worlds[0], targetWorld].find((world) => world.id === id),
        saveActiveStory,
        resetCurrentStoryState,
        setSelectedWorldSheetId,
        setActiveView,
      });
    });

    const updatedStory = saveActiveStory.mock.calls[0][0];
    expect(updatedStory).toMatchObject({
      templateWorldId: targetWorld.id,
      templateWorldKey: "world-two",
      templateWorldVersion: 5,
    });
    expect(updatedStory.worldOverlay).toEqual({
      worldPatch: {},
      modifiedLocations: {},
      addedLocations: [],
      removedLocationIds: [],
      modifiedLoreEntries: {},
      addedLoreEntries: [],
      removedLoreEntryIds: [],
    });
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(targetWorld.id);
    expect(setActiveView).toHaveBeenCalledWith("story");
    expect(resetCurrentStoryState).toHaveBeenCalledWith(activeStory.id, updatedStory, targetWorld, expect.any(Array));
  });

  it("deleteActiveStory removes runtime data and clears selection", () => {
    const { stories } = createAppFixtures();
    const clearActiveStorySelection = vi.fn();
    const removeStoryMeta = vi.fn();
    const maintenance = { removeStoryRuntimeData: vi.fn() };
    const storiesRepo = { deleteStory: vi.fn() };

    const { result } = renderHook(() => useStoryActions(), { wrapper: TestProviders });

    act(() => {
      result.current.deleteActiveStory({
        activeStory: stories[0],
        clearActiveStorySelection,
        removeStoryMeta,
        repository: { stories: storiesRepo, maintenance },
      });
    });

    expect(storiesRepo.deleteStory).toHaveBeenCalledWith("story-1");
    expect(maintenance.removeStoryRuntimeData).toHaveBeenCalledWith("story-1");
    expect(removeStoryMeta).toHaveBeenCalledWith("story-1");
    expect(clearActiveStorySelection).toHaveBeenCalled();
  });
});
