import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAppFixtures } from "./testFixtures";

const { downloadJsonMock, readJsonFileMock } = vi.hoisted(() => ({
  downloadJsonMock: vi.fn(),
  readJsonFileMock: vi.fn(),
}));

vi.mock("../src/utils/helpers", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/helpers")>("../src/utils/helpers");
  return {
    ...actual,
    downloadJson: downloadJsonMock,
    readJsonFile: readJsonFileMock,
    createId: vi.fn((prefix: string) => `${prefix}_mock_id_${Math.random().toString(16).slice(2, 6)}`),
  };
});

import useImportExport from "../src/hooks/useImportExport";

describe("useImportExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a character bundle with a safe filename", () => {
    const { characters } = createAppFixtures();
    const { result } = renderHook(() => useImportExport());

    act(() => {
      result.current.exportCharacter({ character: characters[0] as any });
    });

    expect(downloadJsonMock).toHaveBeenCalledTimes(1);
    expect(downloadJsonMock).toHaveBeenCalledWith(
      "mira.character.json",
      expect.objectContaining({
        type: "roleplay-character",
        version: 1,
        character: expect.objectContaining({ id: "char-1", name: "Mira" }),
      })
    );
  });

  it("exports the active story bundle", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const { result } = renderHook(() => useImportExport());

    act(() => {
      result.current.exportActiveStory({
        activeStory: stories[0] as any,
        getWorld: (id: string) => worlds.find((world) => world.id === id) as any,
        getStoryCharacters: (story: any) => characters.filter((character) => story.characterIds.includes(character.id)) as any,
        chatHistory: [{ role: "assistant", content: "Saved chat one" }] as any,
        activeStoryId: "story-1",
      });
    });

    expect(downloadJsonMock).toHaveBeenCalledTimes(1);
    expect(downloadJsonMock).toHaveBeenCalledWith(
      "story-one.story.json",
      expect.objectContaining({
        type: "roleplay-story-bundle",
        version: 1,
        story: expect.objectContaining({ id: "story-1", title: "Story One" }),
        world: expect.objectContaining({ id: "world-1", name: "World One" }),
        characters: expect.any(Array),
      })
    );
  });

  it("handleImportFile reads JSON, resets the input, and calls the handler", async () => {
    const { result } = renderHook(() => useImportExport());
    const handler = vi.fn();
    const file = new File([JSON.stringify({ ok: true })], "bundle.json", { type: "application/json" });
    readJsonFileMock.mockResolvedValueOnce({ imported: true });

    const event = {
      target: {
        files: [file],
        value: "bundle.json",
      },
    } as any;

    await act(async () => {
      await result.current.handleImportFile(event, handler);
    });

    expect(readJsonFileMock).toHaveBeenCalledWith(file);
    expect(handler).toHaveBeenCalledWith({ imported: true });
    expect(event.target.value).toBe("");
  });

  it("handleImportFile alerts when JSON reading fails", async () => {
    const { result } = renderHook(() => useImportExport());
    const handler = vi.fn();
    const file = new File(["bad"], "bad.json", { type: "application/json" });
    readJsonFileMock.mockRejectedValueOnce(new Error("Could not read JSON file"));

    const event = {
      target: {
        files: [file],
        value: "bad.json",
      },
    } as any;

    await act(async () => {
      await result.current.handleImportFile(event, handler);
    });

    expect(alert).toHaveBeenCalledWith("Could not read JSON file");
    expect(handler).not.toHaveBeenCalled();
    expect(event.target.value).toBe("");
  });

  it("imports a character bundle and selects the imported character", () => {
    const { worlds, characters } = createAppFixtures();
    const saveCharacterList = vi.fn();
    const setSelectedCharacterSheetId = vi.fn();
    const setActiveView = vi.fn();
    const { result } = renderHook(() => useImportExport());

    act(() => {
      result.current.importCharacterBundle({
        parsed: {
          type: "roleplay-character",
          character: {
            name: "Imported Mira",
            shortDescription: "Imported char",
            lorebook: [{ name: "Imported Lore", keywords: ["imported"], content: "Lore", enabled: true, alwaysOn: false }],
          },
        },
        worlds: worlds as any,
        characters: characters as any,
        saveCharacterList,
        setSelectedCharacterSheetId,
        setActiveView,
      });
    });

    const nextCharacters = saveCharacterList.mock.calls[0][0];
    const importedCharacter = nextCharacters.at(-1);
    expect(importedCharacter).toMatchObject({
      name: "Imported Mira",
      shortDescription: "Imported char",
    });
    expect(setSelectedCharacterSheetId).toHaveBeenCalledWith(importedCharacter.id);
    expect(setActiveView).toHaveBeenCalledWith("character");
  });

  it("imports a world bundle and selects the imported world", () => {
    const { worlds } = createAppFixtures();
    const saveWorldList = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setActiveView = vi.fn();
    const { result } = renderHook(() => useImportExport());

    act(() => {
      result.current.importWorldBundle({
        parsed: {
          type: "roleplay-world",
          world: {
            name: "Imported World",
            shortDescription: "Imported world",
            worldLorebook: [{ name: "World Lore", keywords: ["imported"], content: "Lore", enabled: true, alwaysOn: false }],
          },
        },
        worlds: worlds as any,
        saveWorldList,
        setSelectedWorldSheetId,
        setActiveView,
      });
    });

    const nextWorlds = saveWorldList.mock.calls[0][0];
    const importedWorld = nextWorlds.at(-1);
    expect(importedWorld).toMatchObject({
      name: "Imported World",
      shortDescription: "Imported world",
    });
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(importedWorld.id);
    expect(setActiveView).toHaveBeenCalledWith("world");
  });

  it("imports a story bundle, remaps ids, and activates the imported story", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const saveWorldList = vi.fn();
    const saveCharacterList = vi.fn();
    const saveStoryList = vi.fn();
    const setActiveStoryId = vi.fn();
    const setChatHistory = vi.fn();
    const setActiveLoreMemory = vi.fn();
    const setSelectedCharacterSheetId = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setStoryDraft = vi.fn();
    const setActiveView = vi.fn();
    const repository = {
      activeStory: { set: vi.fn() },
      chats: { save: vi.fn() },
      loreMemory: { save: vi.fn() },
    };

    const { result } = renderHook(() => useImportExport());

    act(() => {
      result.current.importStoryBundle({
        parsed: {
          type: "roleplay-story-bundle",
          story: {
            id: "old-story",
            title: "Imported Story",
            worldId: "old-world",
            characterIds: ["old-char"],
            mainCharacterId: "old-char",
            storyLorebook: [{ name: "Story Lore", keywords: ["story"], content: "Lore", enabled: true, alwaysOn: false }],
            currentContext: {
              scene: { currentObjective: "Find the signal" },
              location: { name: "Old Platform" },
              objects: [],
              recentFacts: {},
            },
            castState: {
              activeCharacters: [{ characterId: "old-char", presence: "active", present: true }],
              relationships: [{ characterId: "old-char", relationshipToUser: "Curious" }],
            },
            greeting: "Imported greeting",
          },
          world: {
            id: "old-world",
            name: "Imported World",
            shortDescription: "Imported world",
          },
          characters: [
            {
              id: "old-char",
              name: "Imported Mira",
              shortDescription: "Imported char",
              goals: "Protect the archive",
            },
          ],
          chatHistory: [{ role: "assistant", content: "Imported chat" }],
        },
        worlds: worlds as any,
        characters: characters as any,
        stories: stories as any,
        saveWorldList,
        saveCharacterList,
        saveStoryList,
        setActiveStoryId,
        repository,
        setChatHistory,
        setActiveLoreMemory,
        setSelectedCharacterSheetId,
        setSelectedWorldSheetId,
        setStoryDraft,
        setActiveView,
      });
    });

    const nextWorlds = saveWorldList.mock.calls[0][0];
    const nextCharacters = saveCharacterList.mock.calls[0][0];
    const nextStories = saveStoryList.mock.calls[0][0];
    const importedWorld = nextWorlds.at(-1);
    const importedCharacter = nextCharacters.at(-1);
    const importedStory = nextStories.at(-1);

    expect(importedWorld.name).toBe("Imported World");
    expect(importedCharacter.name).toBe("Imported Mira");
    expect(importedStory.title).toBe("Imported Story");
    expect(importedStory.worldId).toBe(importedWorld.id);
    expect(importedStory.mainCharacterId).toBe(importedCharacter.id);
    expect(importedStory.characterIds).toEqual([importedCharacter.id]);
    expect(importedStory.castState.activeCharacters[0].characterId).toBe(importedCharacter.id);
    expect(setActiveStoryId).toHaveBeenCalledWith(importedStory.id);
    expect(repository.activeStory.set).toHaveBeenCalledWith(importedStory.id);
    expect(setChatHistory).toHaveBeenCalledWith([{ role: "assistant", content: "Imported chat" }]);
    expect(repository.chats.save).toHaveBeenCalledWith(importedStory.id, [{ role: "assistant", content: "Imported chat" }]);
    expect(setActiveLoreMemory).toHaveBeenCalledWith([]);
    expect(repository.loreMemory.save).toHaveBeenCalledWith(importedStory.id, []);
    expect(setSelectedCharacterSheetId).toHaveBeenCalledWith(importedCharacter.id);
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(importedWorld.id);
    expect(setStoryDraft).toHaveBeenCalledWith(null);
    expect(setActiveView).toHaveBeenCalledWith("story");
  });
});
