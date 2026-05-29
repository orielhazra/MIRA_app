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
        getStoryCharacters: (story: any) => characters.filter((character) => (story.castMembers || []).some((m: any) => m.templateCharacterId === character.id)) as any,
        chatHistory: [{ role: "assistant", content: "Saved chat one" }] as any,
      });
    });

    expect(downloadJsonMock).toHaveBeenCalledTimes(1);
    expect(downloadJsonMock).toHaveBeenCalledWith(
      "story-one.story.json",
      expect.objectContaining({
        type: "roleplay-story-bundle",
        version: 2,
        story: expect.objectContaining({ id: "story-1", title: "Story One", templateWorldId: "world-1" }),
        world: expect.objectContaining({ id: "world-1", name: "World One", templateKey: "world-1", templateVersion: 1 }),
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
            id: "old-world-id",
            templateKey: "imported-world",
            templateVersion: 4,
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
      templateKey: "imported-world",
      templateVersion: 4,
    });
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(importedWorld.id);
    expect(setActiveView).toHaveBeenCalledWith("world");
  });

  it("reuses an existing matching template version when importing a world bundle", () => {
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
            id: "foreign-id",
            templateKey: worlds[0].templateKey,
            templateVersion: worlds[0].templateVersion,
            name: "Imported Duplicate World",
            shortDescription: "Should reuse existing",
          },
        },
        worlds: worlds as any,
        saveWorldList,
        setSelectedWorldSheetId,
        setActiveView,
      });
    });

    expect(saveWorldList).not.toHaveBeenCalled();
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(worlds[0].id);
    expect(setActiveView).toHaveBeenCalledWith("world");
  });

  it("imports a story bundle, remaps ids, and activates the imported story", () => {
    const { worlds, characters } = createAppFixtures();
    const saveWorldList = vi.fn();
    const saveCharacterList = vi.fn();
    const saveActiveStory = vi.fn();
    const setActiveStory = vi.fn();
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
            templateWorldId: "old-world",
            templateWorldKey: "aldmyr",
            templateWorldVersion: 7,
            worldOverlay: {
              worldPatch: { shortDescription: "Imported overlay summary" },
              modifiedLocations: {},
              addedLocations: [],
              removedLocationIds: [],
              modifiedLoreEntries: {},
              addedLoreEntries: [],
              removedLoreEntryIds: [],
            },
            characterIds: ["old-char"],
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
            templateKey: "aldmyr",
            templateVersion: 7,
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
        saveWorldList,
        saveCharacterList,
        saveActiveStory,
        setActiveStory,
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
    const importedWorld = nextWorlds.at(-1);
    const importedCharacter = nextCharacters.at(-1);
    const importedStory = saveActiveStory.mock.calls[0][0];

    expect(importedWorld.name).toBe("Imported World");
    expect(importedWorld.templateKey).toBe("aldmyr");
    expect(importedWorld.templateVersion).toBe(7);
    expect(importedCharacter.name).toBe("Imported Mira");
    expect(importedStory.title).toBe("Imported Story");
    expect(importedStory.templateWorldId).toBe(importedWorld.id);
    expect(importedStory.templateWorldKey).toBe("aldmyr");
    expect(importedStory.templateWorldVersion).toBe(7);
    expect(importedStory.worldOverlay).toMatchObject({ worldPatch: { shortDescription: "Imported overlay summary" } });
    
    // Check cast member mapping
    expect(importedStory.castMembers[0].templateCharacterId).toBe(importedCharacter.id);
    expect(importedStory.castState.activeCharacters[0].castMemberId).toBe(importedStory.castMembers[0].id);
    
    expect(setActiveStory).toHaveBeenCalledWith(importedStory);
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

  it("reuses an existing matching template version when importing a story bundle", () => {
    const { worlds, characters } = createAppFixtures();
    const saveWorldList = vi.fn();
    const saveCharacterList = vi.fn();
    const saveActiveStory = vi.fn();
    const setActiveStory = vi.fn();
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
            id: "old-story-2",
            title: "Imported Reused Story",
            templateWorldId: "foreign-world",
            templateWorldKey: worlds[0].templateKey,
            templateWorldVersion: worlds[0].templateVersion,
            worldOverlay: {
              worldPatch: {},
              modifiedLocations: {},
              addedLocations: [],
              removedLocationIds: [],
              modifiedLoreEntries: {},
              addedLoreEntries: [],
              removedLoreEntryIds: [],
            },
            characterIds: ["old-char"],
            currentContext: { scene: {}, location: {}, objects: [], recentFacts: {} },
            castState: { activeCharacters: [{ characterId: "old-char", presence: "active", present: true }], relationships: [] },
            greeting: "Imported greeting",
          },
          world: {
            id: "foreign-world",
            templateKey: worlds[0].templateKey,
            templateVersion: worlds[0].templateVersion,
            name: "Duplicate Imported World",
          },
          characters: [{ id: "old-char", name: "Imported Mira", shortDescription: "Imported char" }],
          chatHistory: [{ role: "assistant", content: "Imported chat" }],
        },
        worlds: worlds as any,
        characters: characters as any,
        saveWorldList,
        saveCharacterList,
        saveActiveStory,
        setActiveStory,
        repository,
        setChatHistory,
        setActiveLoreMemory,
        setSelectedCharacterSheetId,
        setSelectedWorldSheetId,
        setStoryDraft,
        setActiveView,
      });
    });

    expect(saveWorldList).not.toHaveBeenCalled();
    const importedStory = saveActiveStory.mock.calls[0][0];
    expect(importedStory.templateWorldId).toBe(worlds[0].id);
    expect(importedStory.templateWorldKey).toBe(worlds[0].templateKey);
    expect(importedStory.templateWorldVersion).toBe(worlds[0].templateVersion);
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(worlds[0].id);
  });
});
