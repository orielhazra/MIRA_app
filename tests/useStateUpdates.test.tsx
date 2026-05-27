import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useStateUpdates from "../src/hooks/useStateUpdates";
import { createAppFixtures } from "./testFixtures";

vi.mock("../src/services/koboldApi", () => ({
  streamChatCompletion: vi.fn(),
}));

import { streamChatCompletion } from "../src/services/koboldApi";

describe("useStateUpdates", () => {
  it("togglePendingUpdate adds and removes ids from array selection", () => {
    const { result } = renderHook(() => useStateUpdates());
    const setSelectedPendingUpdateIds = vi.fn();

    act(() => {
      result.current.togglePendingUpdate({
        updateId: "update-1",
        selectedPendingUpdateIds: [],
        setSelectedPendingUpdateIds,
      });
    });

    expect(setSelectedPendingUpdateIds).toHaveBeenCalledWith(["update-1"]);

    act(() => {
      result.current.togglePendingUpdate({
        updateId: "update-1",
        selectedPendingUpdateIds: ["update-1"],
        setSelectedPendingUpdateIds,
      });
    });

    expect(setSelectedPendingUpdateIds).toHaveBeenLastCalledWith([]);
  });

  it("extractStateUpdates parses updates and selects them by default", async () => {
    const { worlds, characters, stories } = createAppFixtures();
    vi.mocked(streamChatCompletion).mockResolvedValueOnce(
      '{"updates":[{"category":"location","title":"Move scene","target":"Scene","to":"Platform 9","details":"The cast moved.","confidence":0.9}]}'
    );

    const setIsExtractingUpdates = vi.fn();
    const setPendingUpdateStatus = vi.fn();
    const setPendingUpdates = vi.fn();
    const setSelectedPendingUpdateIds = vi.fn();

    const { result } = renderHook(() => useStateUpdates());

    await act(async () => {
      await result.current.extractStateUpdates({
        activeStory: stories[0],
        activeWorld: worlds[0],
        activeStoryCharacters: [characters[0]],
        isGenerating: false,
        isExtractingUpdates: false,
        chatHistory: [
          { role: "user", content: "We should head to Platform 9." },
          { role: "assistant", content: "Mira nods and walks there." },
        ],
        setIsExtractingUpdates,
        setPendingUpdateStatus,
        setPendingUpdates,
        setSelectedPendingUpdateIds,
      });
    });

    const parsedUpdates = setPendingUpdates.mock.calls.at(-1)?.[0];
    expect(parsedUpdates).toHaveLength(1);
    expect(parsedUpdates[0]).toMatchObject({
      category: "location",
      title: "Move scene",
      target: "Scene",
      to: "Platform 9",
      details: "The cast moved.",
      confidence: 0.9,
    });
    expect(setSelectedPendingUpdateIds).toHaveBeenLastCalledWith([parsedUpdates[0].id]);
    expect(setPendingUpdateStatus).toHaveBeenLastCalledWith("1 suggested update ready for review.");
    expect(setIsExtractingUpdates).toHaveBeenNthCalledWith(1, true);
    expect(setIsExtractingUpdates).toHaveBeenLastCalledWith(false);
  });

  it("applySelectedPendingUpdates saves normalized story changes and clears applied updates", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const saveStoryList = vi.fn();
    const setPendingUpdates = vi.fn();
    const setSelectedPendingUpdateIds = vi.fn();
    const setPendingUpdateStatus = vi.fn();

    const update = {
      id: "update-1",
      category: "location",
      title: "Move scene",
      target: "Scene",
      to: "Platform 9",
      details: "The cast moved.",
    };

    const { result } = renderHook(() => useStateUpdates());

    act(() => {
      result.current.applySelectedPendingUpdates({
        activeStory: stories[0],
        stories,
        activeWorld: worlds[0],
        activeStoryCharacters: [characters[0]],
        pendingUpdates: [update],
        selectedPendingUpdateIds: ["update-1"],
        saveStoryList,
        setPendingUpdates,
        setSelectedPendingUpdateIds,
        setPendingUpdateStatus,
      });
    });

    const nextStories = saveStoryList.mock.calls[0][0];
    const updatedStory = nextStories.find((story: any) => story.id === stories[0].id);
    expect(updatedStory.currentContext.location.name).toBe("Platform 9");
    expect(setPendingUpdates).toHaveBeenCalledWith([]);
    expect(setSelectedPendingUpdateIds).toHaveBeenCalledWith([]);
    expect(setPendingUpdateStatus).toHaveBeenCalledWith(
      "1 update applied to Scene Control / Cast State / Story Memory."
    );
  });
});
