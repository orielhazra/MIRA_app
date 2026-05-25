// Generation core hook — LLM streaming, abort, retry, progress tracking.
// Depends on: activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory.
// Used by: useChatActions (generateAssistantReply).

import { useRef } from "react";
import { GENERATION_SETTINGS } from "../constants/defaultData.js";
import { buildMessagesForRequest } from "../services/prompt.js";
import { cleanGeneratedReply, countPromptTokens, estimateGeneratedTokens, streamChatCompletion } from "../services/koboldApi.js";
import { inspectLoreInjection } from "../services/lore.js";
import { playCompletionSound } from "../utils/helpers.js";
import { isAssistantMessageWithOptions } from "../components/ChatView.jsx";

export default function useGeneration() {
  const abortControllerRef = useRef(null);
  const lastGenerationRequestRef = useRef(null);

  async function generateAssistantReply({
    visibleHistory, promptHistory, privateInstruction = "", finalBuilder,
    activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
    setChatHistory, saveChatForActiveStory, setActiveLoreMemory, saveLoreForActiveStory,
    setIsGenerating, setEditingMessageIndex, setPromptTokens, setGenerationStatus, setProgressPercent
  }) {
    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastGenerationRequestRef.current = { visibleHistory, promptHistory, privateInstruction, finalBuilder };

    setIsGenerating(true); setEditingMessageIndex(null); setChatHistory(visibleHistory);
    setGenerationStatus("Generating..."); setProgressPercent(1);

    const inspection = inspectLoreInjection({
      story: activeStory, world: activeWorld, character: activeCharacter,
      characters: activeStoryCharacters, history: promptHistory, activeLoreMemory
    });
    setActiveLoreMemory(inspection.nextMemory); saveLoreForActiveStory(inspection.nextMemory);

    const requestMessages = buildMessagesForRequest({
      story: activeStory, world: activeWorld, character: activeCharacter,
      characters: activeStoryCharacters, history: promptHistory,
      activeLoreMemory: inspection.selectedEntries, privateInstruction
    });

    try {
      try {
        const tokenCount = await countPromptTokens(requestMessages, { signal: controller.signal });
        setPromptTokens(`${tokenCount} tokens`);
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        setPromptTokens("token count unavailable");
      }

      const streamedReply = await streamChatCompletion(requestMessages, (fullReply) => {
        setChatHistory([...visibleHistory.slice(0, -1), { role: "assistant", content: fullReply || "Thinking..." }]);
        const estimatedTokens = estimateGeneratedTokens(fullReply);
        const percent = Math.min(100, Math.round((estimatedTokens / GENERATION_SETTINGS.maxTokens) * 100));
        setProgressPercent(percent);
        setGenerationStatus(`Generating: ~${estimatedTokens}/${GENERATION_SETTINGS.maxTokens} tokens`);
      }, { signal: controller.signal });

      const fullReply = cleanGeneratedReply(streamedReply) || "No response received.";
      const finalHistory = finalBuilder(fullReply);
      setChatHistory(finalHistory); saveChatForActiveStory(finalHistory);
      setProgressPercent(100); setGenerationStatus("Complete"); playCompletionSound();
    } catch (error) {
      if (error?.name === "AbortError") {
        setChatHistory(promptHistory); saveChatForActiveStory(promptHistory); setGenerationStatus("Canceled");
      } else {
        const message = error instanceof Error ? error.message : String(error);
        const errorHistory = [...visibleHistory.slice(0, -1), { role: "assistant", content: `Error: ${message}` }];
        setChatHistory(errorHistory); saveChatForActiveStory(errorHistory); setGenerationStatus("Error - use Retry to try again");
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setIsGenerating(false);
      setTimeout(() => { setProgressPercent(0); setGenerationStatus("Idle"); }, 1200);
    }
  }

  function cancelGeneration() { abortControllerRef.current?.abort(); }

  async function retryLastGeneration(deps) {
    if (deps.isGenerating) return;
    const request = lastGenerationRequestRef.current;
    if (!request) return alert("There is no previous generation to retry yet.");
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
