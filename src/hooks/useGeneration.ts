// Generation core hook — LLM streaming, abort, retry, progress tracking.
// Depends on: activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory.
// Used by: useChatActions (generateAssistantReply).

import { useRef } from "react";
import { GENERATION_SETTINGS } from "../constants/defaultData";
import { buildMessagesForRequest } from "../services/prompt";
import {
  cleanGeneratedReply,
  countPromptTokens,
  estimateGeneratedTokens,
  streamChatCompletion,
} from "../services/koboldApi";
import { inspectLoreInjection } from "../services/lore";
import { playCompletionSound } from "../utils/helpers";
import { ChatMessage, LoreEntry, Story, World, Character } from "../types";

interface GenerationDeps {
  visibleHistory: ChatMessage[];
  promptHistory: ChatMessage[];
  privateInstruction?: string;
  finalBuilder: (reply: string) => ChatMessage[];
  activeStory: Story;
  activeWorld: World;
  activeCharacter: Character | null;
  activeStoryCharacters: Character[];
  activeLoreMemory: LoreEntry[];
  setChatHistory: (history: ChatMessage[]) => void;
  saveChatForActiveStory: (history: ChatMessage[]) => void;
  setActiveLoreMemory: (memory: LoreEntry[]) => void;
  saveLoreForActiveStory: (memory: LoreEntry[]) => void;
  setIsGenerating: (value: boolean) => void;
  setEditingMessageIndex: (index: number | null) => void;
  setPromptTokens: (value: string) => void;
  setGenerationStatus: (status: string) => void;
  setProgressPercent: (percent: number) => void;
  isGenerating?: boolean;
}

interface LastRequest {
  visibleHistory: ChatMessage[];
  promptHistory: ChatMessage[];
  privateInstruction: string;
  finalBuilder: (reply: string) => ChatMessage[];
}

export default function useGeneration() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastGenerationRequestRef = useRef<LastRequest | null>(null);

  async function generateAssistantReply(deps: GenerationDeps) {
    const {
      visibleHistory,
      promptHistory,
      privateInstruction = "",
      finalBuilder,
      activeStory,
      activeWorld,
      activeCharacter,
      activeStoryCharacters,
      activeLoreMemory,
      setChatHistory,
      saveChatForActiveStory,
      setActiveLoreMemory,
      saveLoreForActiveStory,
      setIsGenerating,
      setEditingMessageIndex,
      setPromptTokens,
      setGenerationStatus,
      setProgressPercent,
    } = deps;

    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastGenerationRequestRef.current = {
      visibleHistory,
      promptHistory,
      privateInstruction,
      finalBuilder,
    };

    setIsGenerating(true);
    setEditingMessageIndex(null);
    setChatHistory(visibleHistory);
    setGenerationStatus("Generating...");
    setProgressPercent(1);

    const inspection = inspectLoreInjection({
      story: activeStory,
      world: activeWorld,
      character: activeCharacter,
      characters: activeStoryCharacters,
      history: promptHistory,
      activeLoreMemory,
    });

    setActiveLoreMemory(inspection.nextMemory);
    saveLoreForActiveStory(inspection.nextMemory);

    const requestMessages = buildMessagesForRequest({
      story: activeStory,
      world: activeWorld,
      character: activeCharacter,
      characters: activeStoryCharacters,
      history: promptHistory,
      activeLoreMemory: inspection.selectedEntries,
      privateInstruction,
    });

    try {
      try {
        const tokenCount = await countPromptTokens(requestMessages, {
          signal: controller.signal,
        });
        setPromptTokens(`${tokenCount} tokens`);
      } catch (error: any) {
        if (error?.name === "AbortError") throw error;
        setPromptTokens("token count unavailable");
      }

      const streamedReply = await streamChatCompletion(
        requestMessages,
        (fullReply: string) => {
          const streamingHistory: ChatMessage[] = [
            ...visibleHistory.slice(0, -1),
            { role: "assistant", content: fullReply || "Thinking..." },
          ];
          setChatHistory(streamingHistory);
          const estimatedTokens = estimateGeneratedTokens(fullReply);
          const percent = Math.min(
            100,
            Math.round((estimatedTokens / GENERATION_SETTINGS.maxTokens) * 100)
          );
          setProgressPercent(percent);
          setGenerationStatus(
            `Generating: ~${estimatedTokens}/${GENERATION_SETTINGS.maxTokens} tokens`
          );
        },
        { signal: controller.signal }
      );

      const fullReply = cleanGeneratedReply(streamedReply) || "No response received.";
      const finalHistory = finalBuilder(fullReply);
      setChatHistory(finalHistory);
      saveChatForActiveStory(finalHistory);
      setProgressPercent(100);
      setGenerationStatus("Complete");
      playCompletionSound();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setChatHistory(promptHistory);
        saveChatForActiveStory(promptHistory);
        setGenerationStatus("Canceled");
      } else {
        const message = error instanceof Error ? error.message : String(error);
        const errorHistory: ChatMessage[] = [
          ...visibleHistory.slice(0, -1),
          { role: "assistant", content: `Error: ${message}` },
        ];
        setChatHistory(errorHistory);
        saveChatForActiveStory(errorHistory);
        setGenerationStatus("Error - use Retry to try again");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
      setTimeout(() => {
        setProgressPercent(0);
        setGenerationStatus("Idle");
      }, 1200);
    }
  }

  function cancelGeneration() {
    abortControllerRef.current?.abort();
  }

  async function retryLastGeneration(deps: GenerationDeps) {
    if (deps.isGenerating) return;
    const request = lastGenerationRequestRef.current;
    if (!request) {
      alert("There is no previous generation to retry yet.");
      return;
    }
    await generateAssistantReply({ ...request, ...deps });
  }

  return {
    generateAssistantReply,
    cancelGeneration,
    retryLastGeneration,
    abortControllerRef,
    lastGenerationRequestRef,
  };
}
