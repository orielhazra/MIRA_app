// Chat operations hook — send, continue, reroll, editing, delete, reset.

import { ChatMessage, Story, World, Character } from "../types/index";
import { getMessageDisplayText, isAssistantMessageWithOptions } from "../utils/chatMessageUtils";
import {
  commitLastAssistantChoice,
  createAssistantReply,
  findLastAssistantIndex,
  appendGeneratedReplyToLastAssistant,
  addAlternativeToLastAssistant,
} from "../utils/appHelpers";

interface ChatActionDeps {
  text?: string;
  chatHistory: ChatMessage[];
  activeStory: Story | null;
  activeWorld: World | null;
  activeStoryCharacters: Character[];
  isGenerating: boolean;
  saveChatForActiveStory: (history: ChatMessage[]) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  setEditingMessageIndex?: (index: number | null) => void;
  index?: number;
  newText?: string;
  regenerateAfterSave?: boolean;
  messageIndex?: number;
  optionIndex?: number;
  resetCurrentStoryState?: () => void;
}

export default function useChatActions({ generateAssistantReply }: { generateAssistantReply: any }) {
  async function sendMessage(deps: ChatActionDeps) {
    const {
      text,
      chatHistory,
      activeStory,
      activeWorld,
      activeStoryCharacters,
      isGenerating,
      saveChatForActiveStory,
    } = deps;

    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0 || isGenerating) return;

    const committed = commitLastAssistantChoice(chatHistory);
    const baseHistory = [...committed, { role: "user", content: text } as ChatMessage];
    saveChatForActiveStory(baseHistory);

    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." } as ChatMessage],
      promptHistory: baseHistory,
      finalBuilder: (reply: string) => [...baseHistory, createAssistantReply(reply)],
    });
  }

  async function continueLastReply(deps: ChatActionDeps) {
    const { chatHistory, isGenerating } = deps;
    if (isGenerating) return;

    const lastAssistantIndex = findLastAssistantIndex(chatHistory);
    if (lastAssistantIndex === -1) return alert("Nothing to continue.");
    if (lastAssistantIndex !== chatHistory.length - 1) {
      return alert("Continue works best after an assistant reply. Generate or reroll the next reply first.");
    }

    const committed = commitLastAssistantChoice(chatHistory);
    await generateAssistantReply({
      visibleHistory: [...committed, { role: "assistant", content: "Thinking..." } as ChatMessage],
      promptHistory: committed,
      privateInstruction:
        "Continue directly from your previous assistant reply. Add the next natural part of the same reply or scene beat. Do not restart the scene. Do not summarize. Do not speak for the user. Do not ask for the user's next move.",
      finalBuilder: (reply: string) => appendGeneratedReplyToLastAssistant(committed, reply),
    });
  }

  async function elaborateLastReply(deps: ChatActionDeps) {
    const { chatHistory, isGenerating } = deps;
    if (isGenerating) return;

    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      return alert("The last message is not an assistant reply.");
    }

    const originalReply = getMessageDisplayText(lastMessage);
    const historyWithoutLastAssistant = chatHistory.slice(0, -1);

    await generateAssistantReply({
      visibleHistory: [...historyWithoutLastAssistant, { role: "assistant", content: "Thinking..." } as ChatMessage],
      promptHistory: historyWithoutLastAssistant,
      privateInstruction: `Rewrite the previous assistant reply as a richer version with more sensory detail, emotion, atmosphere, and in-character nuance. Preserve the same basic intent and scene direction. Do not make the reply wildly longer than needed. Do not speak for the user. Return only the revised in-world reply.\n\nPrevious assistant reply:\n"""${originalReply}"""`,
      finalBuilder: (reply: string) => addAlternativeToLastAssistant(chatHistory, reply),
    });
  }

  async function rerollLastReply(deps: ChatActionDeps) {
    const { chatHistory, isGenerating } = deps;
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to reroll.");

    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      return alert("The last message is not an assistant reply.");
    }

    const historyWithoutLastAssistant = chatHistory.slice(0, -1);
    await generateAssistantReply({
      visibleHistory: [...historyWithoutLastAssistant, { role: "assistant", content: "Thinking..." } as ChatMessage],
      promptHistory: historyWithoutLastAssistant,
      privateInstruction:
        "Generate a different in-character assistant reply for this point in the scene. Keep the same story context, but vary the wording, emotional beat, and immediate action. Do not mention rerolling.",
      finalBuilder: (reply: string) => addAlternativeToLastAssistant(chatHistory, reply),
    });
  }

  async function regenerateFromMessage(deps: ChatActionDeps) {
    const { chatHistory, isGenerating, index = 0, saveChatForActiveStory } = deps;
    if (isGenerating) return;

    const targetMessage = chatHistory[index];
    if (!targetMessage) return;
    if (index <= 0 && targetMessage.role === "assistant") {
      alert("The opening message cannot be regenerated from here.");
      return;
    }

    let keepCount = index + 1;
    let instruction =
      "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.";

    if (targetMessage.role === "assistant") {
      keepCount = index;
      instruction =
        "Regenerate the assistant reply at this point in the scene. Write a fresh in-character continuation based only on the story context and the chat before this message. Do not mention regeneration.";
    }

    const baseHistory = commitLastAssistantChoice(chatHistory).slice(0, keepCount);
    saveChatForActiveStory(baseHistory);

    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." } as ChatMessage],
      promptHistory: baseHistory,
      privateInstruction: instruction,
      finalBuilder: (reply: string) => [...baseHistory, createAssistantReply(reply)],
    });
  }

  function rollbackLastExchange({ chatHistory, isGenerating, saveChatForActiveStory, setChatHistory }: ChatActionDeps) {
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to rollback.");

    const nextHistory = [...chatHistory];
    const last = nextHistory[nextHistory.length - 1];
    const previous = nextHistory[nextHistory.length - 2];

    if (last?.role === "assistant" && previous?.role === "user") nextHistory.splice(nextHistory.length - 2, 2);
    else nextHistory.pop();

    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);
  }

  function resetChat({ isGenerating, resetCurrentStoryState }: ChatActionDeps) {
    if (isGenerating) return;
    if (!confirm("Reset this story's chat back to its opening message?")) return;
    resetCurrentStoryState?.();
  }

  function startEditingMessage({ isGenerating, index = 0, setEditingMessageIndex }: ChatActionDeps) {
    if (isGenerating) return;
    setEditingMessageIndex?.(index);
  }

  function cancelMessageEdit({ setEditingMessageIndex }: ChatActionDeps) {
    setEditingMessageIndex?.(null);
  }

  async function saveMessageEdit(deps: ChatActionDeps) {
    const {
      chatHistory,
      isGenerating,
      index = 0,
      newText = "",
      regenerateAfterSave = false,
      setEditingMessageIndex,
      setChatHistory,
      saveChatForActiveStory,
    } = deps;

    if (isGenerating) return;

    const trimmed = newText.trim();
    if (!trimmed) return alert("Message cannot be empty.");

    const nextHistory = chatHistory.map((message, messageIndex) => {
      if (messageIndex !== index) return message;
      if (isAssistantMessageWithOptions(message)) {
        const alternatives = [...(message.alternatives || [])];
        const selectedIndex = typeof message.selectedIndex === "number" ? message.selectedIndex : 0;
        alternatives[selectedIndex] = trimmed;
        return { ...message, alternatives, content: trimmed };
      }
      return { ...message, content: trimmed };
    });

    setEditingMessageIndex?.(null);
    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);

    if (regenerateAfterSave && nextHistory[index]?.role === "user") {
      await regenerateFromMessageWithHistory(index, nextHistory, deps);
    }
  }

  async function regenerateFromMessageWithHistory(index: number, sourceHistory: ChatMessage[], deps: ChatActionDeps) {
    const targetMessage = sourceHistory[index];
    if (!targetMessage) return;

    const baseHistory = sourceHistory.slice(0, index + 1);
    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." } as ChatMessage],
      promptHistory: baseHistory,
      privateInstruction:
        "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.",
      finalBuilder: (reply: string) => [...baseHistory, createAssistantReply(reply)],
    });
  }

  function deleteMessagesFromIndex({ chatHistory, isGenerating, index = 0, setEditingMessageIndex, setChatHistory, saveChatForActiveStory }: ChatActionDeps) {
    if (isGenerating) return;
    if (index <= 0) return alert("The opening message cannot be deleted from here.");
    if (!confirm("Delete this message and everything after it?")) return;

    const nextHistory = chatHistory.slice(0, index);
    setEditingMessageIndex?.(null);
    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);
  }

  function selectAssistantOption({ chatHistory, messageIndex = 0, optionIndex = 0, setChatHistory, saveChatForActiveStory }: ChatActionDeps) {
    const nextHistory = chatHistory.map((message, index) => {
      if (index !== messageIndex || !isAssistantMessageWithOptions(message)) return message;
      const selectedText = message.alternatives?.[optionIndex] || message.content || "";
      return { ...message, selectedIndex: optionIndex, content: selectedText };
    });

    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);
  }

  return {
    sendMessage,
    continueLastReply,
    elaborateLastReply,
    rerollLastReply,
    regenerateFromMessage,
    rollbackLastExchange,
    resetChat,
    startEditingMessage,
    cancelMessageEdit,
    saveMessageEdit,
    deleteMessagesFromIndex,
    selectAssistantOption,
  };
}
