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
    personas: [
      { id: "persona-1", name: "Explorer" }
    ],
    stories: [
      { 
        id: "story-1", 
        title: "Story One", 
        templateWorldId: "world-1", 
        castMembers: [{ id: "cast-1", templateCharacterId: "char-1", overlay: { identityPatch: {}, modifiedLoreEntries: {}, addedLoreEntries: [], removedLoreEntryIds: [] } }], 
        greeting: "Opening one" 
      },
      { 
        id: "story-2", 
        title: "Story Two", 
        templateWorldId: "world-2", 
        castMembers: [{ id: "cast-2", templateCharacterId: "char-2", overlay: { identityPatch: {}, modifiedLoreEntries: {}, addedLoreEntries: [], removedLoreEntryIds: [] } }], 
        greeting: "Opening two", 
        worldOverlay: { worldPatch: { shortDescription: "Overlay world two" }, modifiedLocations: {}, addedLocations: [], removedLocationIds: [], modifiedLoreEntries: {}, addedLoreEntries: [], removedLoreEntryIds: [] } 
      },
    ],
    chats: {
      "story-1": [{ role: "assistant", content: "Saved chat one" }],
      "story-2": [{ role: "assistant", content: "Saved chat two" }],
    },
    loreMemory: {
      "story-1": [{ id: "lore-1", name: "Lore One", keywords: [], content: "A", enabled: true, alwaysOn: false }],
      "story-2": [{ id: "lore-2", name: "Lore Two", keywords: [], content: "B", enabled: true, alwaysOn: false }],
    },
    storedActiveStory: null as string | null,
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
    personas: {
      list: vi.fn((fallback = []) => (state.personas.length ? clone(state.personas) : clone(fallback))),
      saveAll: vi.fn((personas) => {
        state.personas = clone(personas);
        return true;
      }),
      clear: vi.fn(),
    },
    stories: {
      listMeta: vi.fn((fallback = []) => state.stories.length
        ? state.stories.map((story: any) => ({
            id: story.id,
            title: story.title,
            templateWorldId: story.templateWorldId,
            castMemberCount: (story.castMembers || []).length,
            createdAt: story.createdAt,
            lastPlayedAt: story.lastPlayedAt,
          }))
        : clone(fallback)),
      loadFull: vi.fn((storyId: string) => clone(state.stories.find((story: any) => story.id === storyId) || null)),
      saveStory: vi.fn((story: any) => {
        const index = state.stories.findIndex((item: any) => item.id === story.id);
        if (index >= 0) state.stories[index] = clone(story);
        else state.stories.push(clone(story));
        return true;
      }),
      deleteStory: vi.fn((storyId: string) => {
        state.stories = state.stories.filter((story: any) => story.id !== storyId);
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
      get: vi.fn(() => state.storedActiveStory),
      set: vi.fn((storyId: string) => {
        state.storedActiveStory = storyId;
      }),
      clear: vi.fn(() => {
        state.storedActiveStory = null;
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

  it("switches stories and loads chat + lore state", async () => {
    const { result } = renderHook(() => useAppManager());

    await act(async () => {
      await result.current.switchStory("story-2");
    });

    expect(result.current.activeStory?.id).toBe("story-2");
    expect(result.current.activeView).toBe("story");
    expect(result.current.activeStory?.title).toBe("Story Two");
    expect(result.current.activeWorld?.shortDescription).toBe("Overlay world two");
    expect(result.current.chatHistory[0]?.content).toBe("Saved chat two");
    expect(result.current.activeLoreMemory[0]?.name).toBe("Lore Two");
    expect(result.current.selectedWorldSheetId).toBe("world-2");
    
    // In story-character mode, the selected ID should be the castMemberId ("cast-2" in fixtures)
    expect(result.current.selectedCharacterSheetId).toBe("cast-2");
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
