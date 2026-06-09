import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useChatActions from "../src/hooks/useChatActions";
import { createAppFixtures, TestProviders } from "./testFixtures";

describe("useChatActions", () => {
  it("saveMessageEdit updates the selected assistant alternative and persists it", async () => {
    const { stories, worlds, characters } = createAppFixtures();
    const generateAssistantReply = vi.fn();
    const setEditingMessageIndex = vi.fn();
    const setChatHistory = vi.fn();
    const saveChatForActiveStory = vi.fn();

    const { result } = renderHook(() => useChatActions({ generateAssistantReply }), { wrapper: TestProviders });

    const chatHistory = [
      { role: "user", content: "Hello" },
      {
        role: "assistant",
        content: "Option B",
        alternatives: ["Option A", "Option B"],
        selectedIndex: 1,
      },
    ] as any;

    await act(async () => {
      await result.current.saveMessageEdit({
        chatHistory,
        activeStory: stories[0],
        activeWorld: worlds[0],
        activeStoryCharacters: [characters[0]],
        isGenerating: false,
        index: 1,
        newText: "Edited option B",
        setEditingMessageIndex,
        setChatHistory,
        saveChatForActiveStory,
      });
    });

    expect(setEditingMessageIndex).toHaveBeenCalledWith(null);
    const savedHistory = setChatHistory.mock.calls[0][0];
    expect(savedHistory[1]).toMatchObject({
      content: "Edited option B",
      selectedIndex: 1,
    });
    expect(savedHistory[1].alternatives).toEqual(["Option A", "Edited option B"]);
    expect(saveChatForActiveStory).toHaveBeenCalledWith(savedHistory);
  });

  it("deleteMessagesFromIndex removes the selected message and everything after it", () => {
    const generateAssistantReply = vi.fn();
    const setEditingMessageIndex = vi.fn();
    const setChatHistory = vi.fn();
    const saveChatForActiveStory = vi.fn();
    const { result } = renderHook(() => useChatActions({ generateAssistantReply }), { wrapper: TestProviders });

    const chatHistory = [
      { role: "assistant", content: "Opening" },
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Reply" },
      { role: "user", content: "Another" },
    ] as any;

    act(() => {
      result.current.deleteMessagesFromIndex({
        chatHistory,
        activeStory: null,
        activeWorld: null,
        activeStoryCharacters: [],
        isGenerating: false,
        index: 2,
        setEditingMessageIndex,
        setChatHistory,
        saveChatForActiveStory,
      });
    });

    expect(setEditingMessageIndex).toHaveBeenCalledWith(null);
    expect(setChatHistory).toHaveBeenCalledWith(chatHistory.slice(0, 2));
    expect(saveChatForActiveStory).toHaveBeenCalledWith(chatHistory.slice(0, 2));
  });

  it("resetChat calls resetCurrentStoryState when confirmed", () => {
    const generateAssistantReply = vi.fn();
    const resetCurrentStoryState = vi.fn();
    const { result } = renderHook(() => useChatActions({ generateAssistantReply }), { wrapper: TestProviders });

    act(() => {
      result.current.resetChat({
        chatHistory: [],
        activeStory: null,
        activeWorld: null,
        activeStoryCharacters: [],
        isGenerating: false,
        saveChatForActiveStory: vi.fn(),
        setChatHistory: vi.fn(),
        resetCurrentStoryState,
      });
    });

    expect(resetCurrentStoryState).toHaveBeenCalled();
  });

  it("sendMessage saves committed history and delegates generation", async () => {
    const { stories, worlds, characters } = createAppFixtures();
    const generateAssistantReply = vi.fn().mockResolvedValue(undefined);
    const saveChatForActiveStory = vi.fn();
    const { result } = renderHook(() => useChatActions({ generateAssistantReply }), { wrapper: TestProviders });

    const chatHistory = [
      {
        role: "assistant",
        content: "Option B",
        alternatives: ["Option A", "Option B"],
        selectedIndex: 1,
      },
    ] as any;

    await act(async () => {
      await result.current.sendMessage({
        text: "Next move",
        chatHistory,
        activeStory: stories[0],
        activeWorld: worlds[0],
        activeStoryCharacters: [characters[0]],
        isGenerating: false,
        saveChatForActiveStory,
        setChatHistory: vi.fn(),
      });
    });

    expect(saveChatForActiveStory).toHaveBeenCalledWith([
      { role: "assistant", content: "Option B" },
      { role: "user", content: "Next move" },
    ]);
    expect(generateAssistantReply).toHaveBeenCalledOnce();
    expect(generateAssistantReply.mock.calls[0][0].promptHistory).toEqual([
      { role: "assistant", content: "Option B" },
      { role: "user", content: "Next move" },
    ]);
  });
});
