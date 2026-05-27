import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppFixtures } from "./testFixtures";

const {
  inspectLoreInjectionMock,
  countPromptTokensMock,
  streamChatCompletionMock,
  buildMessagesForRequestMock,
  playCompletionSoundMock,
} = vi.hoisted(() => ({
  inspectLoreInjectionMock: vi.fn(),
  countPromptTokensMock: vi.fn(),
  streamChatCompletionMock: vi.fn(),
  buildMessagesForRequestMock: vi.fn(),
  playCompletionSoundMock: vi.fn(),
}));

vi.mock("../src/services/lore", async () => {
  const actual = await vi.importActual<typeof import("../src/services/lore")>("../src/services/lore");
  return {
    ...actual,
    inspectLoreInjection: inspectLoreInjectionMock,
  };
});

vi.mock("../src/services/koboldApi", async () => {
  const actual = await vi.importActual<typeof import("../src/services/koboldApi")>("../src/services/koboldApi");
  return {
    ...actual,
    countPromptTokens: countPromptTokensMock,
    streamChatCompletion: streamChatCompletionMock,
  };
});

vi.mock("../src/services/prompt", async () => {
  const actual = await vi.importActual<typeof import("../src/services/prompt")>("../src/services/prompt");
  return {
    ...actual,
    buildMessagesForRequest: buildMessagesForRequestMock,
  };
});

vi.mock("../src/utils/helpers", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/helpers")>("../src/utils/helpers");
  return {
    ...actual,
    playCompletionSound: playCompletionSoundMock,
  };
});

import useGeneration from "../src/hooks/useGeneration";

describe("useGeneration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    inspectLoreInjectionMock.mockReturnValue({
      nextMemory: [{ id: "runtime-lore", name: "Lore", keywords: [], content: "Lore", enabled: true, alwaysOn: false }],
      selectedEntries: [{ id: "runtime-lore", name: "Lore", keywords: [], content: "Lore", enabled: true, alwaysOn: false }],
    });
    buildMessagesForRequestMock.mockReturnValue([{ role: "system", content: "prompt" }]);
    countPromptTokensMock.mockResolvedValue(123);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles a successful generation flow", async () => {
    const { worlds, characters, stories } = createAppFixtures();
    const setChatHistory = vi.fn();
    const saveChatForActiveStory = vi.fn();
    const setActiveLoreMemory = vi.fn();
    const saveLoreForActiveStory = vi.fn();
    const setIsGenerating = vi.fn();
    const setEditingMessageIndex = vi.fn();
    const setPromptTokens = vi.fn();
    const setGenerationStatus = vi.fn();
    const setProgressPercent = vi.fn();

    streamChatCompletionMock.mockImplementation(async (_messages, onChunk) => {
      onChunk?.("Hello there");
      return "Hello there";
    });

    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generateAssistantReply({
        visibleHistory: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Thinking..." },
        ] as any,
        promptHistory: [{ role: "user", content: "Hi" }] as any,
        finalBuilder: (reply: string) => [
          { role: "user", content: "Hi" },
          { role: "assistant", content: reply },
        ] as any,
        activeStory: stories[0] as any,
        activeWorld: worlds[0] as any,
        activeCharacter: characters[0] as any,
        activeStoryCharacters: [characters[0]] as any,
        activeLoreMemory: [],
        setChatHistory,
        saveChatForActiveStory,
        setActiveLoreMemory,
        saveLoreForActiveStory,
        setIsGenerating,
        setEditingMessageIndex,
        setPromptTokens,
        setGenerationStatus,
        setProgressPercent,
      });
    });

    expect(setIsGenerating).toHaveBeenCalledWith(true);
    expect(setEditingMessageIndex).toHaveBeenCalledWith(null);
    expect(setActiveLoreMemory).toHaveBeenCalled();
    expect(saveLoreForActiveStory).toHaveBeenCalled();
    expect(buildMessagesForRequestMock).toHaveBeenCalled();
    expect(countPromptTokensMock).toHaveBeenCalled();
    expect(setPromptTokens).toHaveBeenCalledWith("123 tokens");
    expect(streamChatCompletionMock).toHaveBeenCalled();
    expect(setChatHistory).toHaveBeenCalledWith([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello there" },
    ]);
    expect(saveChatForActiveStory).toHaveBeenCalledWith([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello there" },
    ]);
    expect(setGenerationStatus).toHaveBeenCalledWith("Complete");
    expect(playCompletionSoundMock).toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });

    expect(setProgressPercent).toHaveBeenCalledWith(0);
    expect(setGenerationStatus).toHaveBeenCalledWith("Idle");
    expect(setIsGenerating).toHaveBeenLastCalledWith(false);
  });

  it("stores the last request and retries generation", async () => {
    const { worlds, characters, stories } = createAppFixtures();
    streamChatCompletionMock.mockResolvedValue("Reply");

    const deps = {
      visibleHistory: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Thinking..." },
      ] as any,
      promptHistory: [{ role: "user", content: "Hi" }] as any,
      finalBuilder: (reply: string) => [
        { role: "user", content: "Hi" },
        { role: "assistant", content: reply },
      ] as any,
      activeStory: stories[0] as any,
      activeWorld: worlds[0] as any,
      activeCharacter: characters[0] as any,
      activeStoryCharacters: [characters[0]] as any,
      activeLoreMemory: [],
      setChatHistory: vi.fn(),
      saveChatForActiveStory: vi.fn(),
      setActiveLoreMemory: vi.fn(),
      saveLoreForActiveStory: vi.fn(),
      setIsGenerating: vi.fn(),
      setEditingMessageIndex: vi.fn(),
      setPromptTokens: vi.fn(),
      setGenerationStatus: vi.fn(),
      setProgressPercent: vi.fn(),
      isGenerating: false,
    };

    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generateAssistantReply(deps as any);
    });

    await act(async () => {
      await result.current.retryLastGeneration(deps as any);
    });

    expect(streamChatCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("handles generation errors by saving an error message", async () => {
    const { worlds, characters, stories } = createAppFixtures();
    const setChatHistory = vi.fn();
    const saveChatForActiveStory = vi.fn();
    const setGenerationStatus = vi.fn();

    streamChatCompletionMock.mockRejectedValue(new Error("network failed"));

    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generateAssistantReply({
        visibleHistory: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Thinking..." },
        ] as any,
        promptHistory: [{ role: "user", content: "Hi" }] as any,
        finalBuilder: (reply: string) => [
          { role: "user", content: "Hi" },
          { role: "assistant", content: reply },
        ] as any,
        activeStory: stories[0] as any,
        activeWorld: worlds[0] as any,
        activeCharacter: characters[0] as any,
        activeStoryCharacters: [characters[0]] as any,
        activeLoreMemory: [],
        setChatHistory,
        saveChatForActiveStory,
        setActiveLoreMemory: vi.fn(),
        saveLoreForActiveStory: vi.fn(),
        setIsGenerating: vi.fn(),
        setEditingMessageIndex: vi.fn(),
        setPromptTokens: vi.fn(),
        setGenerationStatus,
        setProgressPercent: vi.fn(),
      });
    });

    expect(setChatHistory).toHaveBeenCalledWith([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Error: network failed" },
    ]);
    expect(saveChatForActiveStory).toHaveBeenCalledWith([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Error: network failed" },
    ]);
    expect(setGenerationStatus).toHaveBeenCalledWith("Error - use Retry to try again");
  });
});
