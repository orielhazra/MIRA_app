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
});
