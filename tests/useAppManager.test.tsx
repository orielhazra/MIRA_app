import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { repoState, mockRepository, resetRepoState } = vi.hoisted(() => {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

  const initialState = {
    worlds: [
      { id: "world-1", name: "World One", shortDescription: "First world" },
      { id: "world-2", name: "World Two", shortDescription: "Second world" },
    ],
    characters: [
      { id: "char-1", name: "Mira", shortDescription: "Lead one", goals: "Find answers", relationshipToUser: "Curious" },
      { id: "char-2", name: "Ari", shortDescription: "Lead two", goals: "Protect the station", relationshipToUser: "Wary" },
    ],
    stories: [
      { id: "story-1", title: "Story One", worldId: "world-1", characterIds: ["char-1"], mainCharacterId: "char-1", greeting: "Opening one" },
      { id: "story-2", title: "Story Two", worldId: "world-2", characterIds: ["char-2"], mainCharacterId: "char-2", greeting: "Opening two" },
    ],
    chats: {
      "story-1": [{ role: "assistant", content: "Saved chat one" }],
      "story-2": [{ role: "assistant", content: "Saved chat two" }],
    },
    loreMemory: {
      "story-1": [{ id: "lore-1", name: "Lore One", keywords: [], content: "A", enabled: true, alwaysOn: false }],
      "story-2": [{ id: "lore-2", name: "Lore Two", keywords: [], content: "B", enabled: true, alwaysOn: false }],
    },
    activeStoryId: null as string | null,
    koboldBaseUrl: "http://localhost:5001",
  };

  const state = clone(initialState);

  const repository = {
    initialize: vi.fn().mockResolvedValue(undefined),
    worlds: {
      list: vi.fn((fallback = []) => (state.worlds.length ? clone(state.worlds) : clone(fallback))),
      saveAll: vi.fn((worlds) => {
        state.worlds = clone(worlds);
        return true;
      }),
      clear: vi.fn(),
    },
    characters: {
      list: vi.fn((fallback = []) => (state.characters.length ? clone(state.characters) : clone(fallback))),
      saveAll: vi.fn((characters) => {
        state.characters = clone(characters);
        return true;
      }),
      clear: vi.fn(),
      removeLegacyChat: vi.fn(),
    },
    stories: {
      list: vi.fn((fallback = []) => (state.stories.length ? clone(state.stories) : clone(fallback))),
      saveAll: vi.fn((stories) => {
        state.stories = clone(stories);
        return true;
      }),
      clear: vi.fn(),
    },
    chats: {
      load: vi.fn((storyId: string, fallback = null) => clone(state.chats[storyId] ?? fallback)),
      save: vi.fn((storyId: string, messages: any[]) => {
        state.chats[storyId] = clone(messages);
        return true;
      }),
      remove: vi.fn(),
    },
    loreMemory: {
      load: vi.fn((storyId: string, fallback = []) => clone(state.loreMemory[storyId] ?? fallback)),
      save: vi.fn((storyId: string, lore: any[]) => {
        state.loreMemory[storyId] = clone(lore);
        return true;
      }),
      remove: vi.fn(),
    },
    activeStory: {
      get: vi.fn(() => state.activeStoryId),
      set: vi.fn((storyId: string) => {
        state.activeStoryId = storyId;
      }),
      clear: vi.fn(() => {
        state.activeStoryId = null;
      }),
    },
    settings: {
      getKoboldBaseUrl: vi.fn((fallback: string) => state.koboldBaseUrl || fallback),
      setKoboldBaseUrl: vi.fn((value: string) => {
        state.koboldBaseUrl = value;
      }),
    },
    maintenance: {
      clearKnownData: vi.fn(),
      removeStoryRuntimeData: vi.fn(),
    },
  };

  return {
    repoState: state,
    mockRepository: repository,
    resetRepoState: () => {
      Object.assign(state, clone(initialState));
    },
  };
});

vi.mock("../src/services/repository", () => ({
  repository: mockRepository,
  isTauri: false,
}));

import useAppManager from "../src/hooks/useAppManager";

describe("useAppManager", () => {
  beforeEach(() => {
    resetRepoState();
    vi.clearAllMocks();
  });

  it("switches stories and loads chat + lore state", () => {
    const { result } = renderHook(() => useAppManager());

    act(() => {
      result.current.switchStory("story-2");
    });

    expect(result.current.activeStoryId).toBe("story-2");
    expect(result.current.activeView).toBe("story");
    expect(result.current.activeStory?.title).toBe("Story Two");
    expect(result.current.chatHistory[0]?.content).toBe("Saved chat two");
    expect(result.current.activeLoreMemory[0]?.name).toBe("Lore Two");
    expect(result.current.selectedWorldSheetId).toBe("world-2");
    expect(result.current.selectedCharacterSheetId).toBe("char-2");
    expect(mockRepository.activeStory.set).toHaveBeenCalledWith("story-2");
  });

  it("opens the story creation sheet from the manager", () => {
    const { result } = renderHook(() => useAppManager());

    act(() => {
      result.current.openStoryCreationSheet();
    });

    expect(result.current.activeView).toBe("story-create");
    expect(result.current.storyDraft).toMatchObject({
      title: "Untitled Story",
    });
  });
});
