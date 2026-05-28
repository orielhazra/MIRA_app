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
import { createAppFixtures } from "./testFixtures";

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

    const { result } = renderHook(() => useStoryActions());

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
    expect(setSelectedCharacterSheetId).toHaveBeenCalledWith("char-2");
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith("world-2");
    expect(setStoryDraft).toHaveBeenCalledWith(null);
    expect(setActiveView).toHaveBeenCalledWith("story");
  });

  it("deleteActiveStory removes runtime data and clears selection", () => {
    const { stories } = createAppFixtures();
    const clearActiveStorySelection = vi.fn();
    const removeStoryMeta = vi.fn();
    const maintenance = { removeStoryRuntimeData: vi.fn() };
    const storiesRepo = { deleteStory: vi.fn() };

    const { result } = renderHook(() => useStoryActions());

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
