import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppFixtures, TestProviders } from "./testFixtures";

const { inspectLoreInjectionMock } = vi.hoisted(() => ({
  inspectLoreInjectionMock: vi.fn(),
}));

vi.mock("../src/services/lore", async () => {
  const actual = await vi.importActual<typeof import("../src/services/lore")>("../src/services/lore");
  return {
    ...actual,
    inspectLoreInjection: inspectLoreInjectionMock,
  };
});

import useLoreActions from "../src/hooks/useLoreActions";

describe("useLoreActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateWorldLore patches the selected lore entry and saves the next world list", () => {
    const { worlds, stories, characters } = createAppFixtures();
    const activeWorld = {
      ...worlds[0],
      worldLorebook: [
        { id: "world-lore-1", name: "Old lore", keywords: ["old"], content: "Old content", enabled: true, alwaysOn: false },
      ],
    } as any;

    const saveWorldList = vi.fn();
    const { result } = renderHook(() => useLoreActions(), { wrapper: TestProviders });

    act(() => {
      result.current.updateWorldLore({
        activeWorld,
        worlds: [activeWorld, worlds[1]] as any,
        saveWorldList,
        activeStory: stories[0] as any,
        characters: characters as any,
        saveActiveStory: vi.fn(),
        activeLoreMemory: [],
        setActiveLoreMemory: vi.fn(),
        saveLoreForActiveStory: vi.fn(),
        index: 0,
        patch: { content: "Updated content" },
      });
    });

    const nextWorlds = saveWorldList.mock.calls[0][0];
    expect(nextWorlds[0].worldLorebook[0]).toMatchObject({
      id: "world-lore-1",
      content: "Updated content",
    });
  });

  it("saveTemporaryLore normalizes and saves temporary lore to the active story", () => {
    const { stories, characters, worlds } = createAppFixtures();
    const activeStory = stories[0] as any;
    const saveActiveStory = vi.fn();
    const { result } = renderHook(() => useLoreActions(), { wrapper: TestProviders });

    act(() => {
      result.current.saveTemporaryLore({
        activeStory,
        activeWorld: worlds[0] as any,
        characters: characters as any,
        saveActiveStory,
        activeLoreMemory: [],
        setActiveLoreMemory: vi.fn(),
        saveLoreForActiveStory: vi.fn(),
        lorebook: [
          { name: "Temp Lore", keywords: ["temp"], content: "Temporary context", enabled: true, alwaysOn: false },
        ],
      });
    });

    const updatedStory = saveActiveStory.mock.calls[0][0];
    expect(updatedStory.temporaryLorebook).toEqual([
      expect.objectContaining({
        name: "Temp Lore",
        keywords: ["temp"],
        content: "Temporary context",
      }),
    ]);
  });

  it("refreshActiveLore stores the inspection result in lore memory", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const setActiveLoreMemory = vi.fn();
    const saveLoreForActiveStory = vi.fn();
    const nextMemory = [
      { id: "runtime-lore", name: "Triggered Lore", keywords: ["station"], content: "Triggered", enabled: true, alwaysOn: false },
    ];

    inspectLoreInjectionMock.mockReturnValueOnce({
      nextMemory,
      selectedEntries: nextMemory,
    });

    const { result } = renderHook(() => useLoreActions(), { wrapper: TestProviders });

    act(() => {
      result.current.refreshActiveLore({
        activeStory: stories[0] as any,
        activeWorld: worlds[0] as any,
        activeStoryCharacters: [characters[0]] as any,
        characters: characters as any,
        saveActiveStory: vi.fn(),
        chatHistory: [{ role: "user", content: "We are at the station." }] as any,
        activeLoreMemory: [],
        setActiveLoreMemory,
        saveLoreForActiveStory,
      });
    });

    expect(inspectLoreInjectionMock).toHaveBeenCalledOnce();
    expect(setActiveLoreMemory).toHaveBeenCalledWith(nextMemory);
    expect(saveLoreForActiveStory).toHaveBeenCalledWith(nextMemory);
  });
});
