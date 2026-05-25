// Chat operations hook — send, continue, elaborate, reroll, editing, delete.
// Depends on: chatHistory, activeStory, activeWorld, activeCharacter, activeStoryCharacters.
// Depends on: generateAssistantReply from useGeneration.

import { getMessageDisplayText, isAssistantMessageWithOptions } from "../features/chat/ChatView.jsx";
import {
  commitLastAssistantChoice, createAssistantReply, findLastAssistantIndex,
  appendGeneratedReplyToLastAssistant, addAlternativeToLastAssistant
} from "../utils/appHelpers";

export default function useChatActions({ generateAssistantReply }) {

  async function sendMessage({
    text, chatHistory, activeStory, activeWorld, activeStoryCharacters, isGenerating,
    saveChatForActiveStory, setChatHistory
  }) {
    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0 || isGenerating) return;
    const committed = commitLastAssistantChoice(chatHistory);
    const baseHistory = [...committed, { role: "user", content: text }];
    saveChatForActiveStory(baseHistory);
    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory,
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)],
      activeStory, activeWorld, activeCharacter: activeStoryCharacters[0] || null,
      activeStoryCharacters, activeLoreMemory: [], // filled by generateAssistantReply from inspection
      setChatHistory, saveChatForActiveStory,
      setActiveLoreMemory: () => {}, saveLoreForActiveStory: () => {},
      setIsGenerating: () => {}, setEditingMessageIndex: () => {},
      setPromptTokens: () => {}, setGenerationStatus: () => {}, setProgressPercent: () => {}
    });
  }

  async function continueLastReply(deps) {
    const { chatHistory, isGenerating, generateAssistantReply: gen, ...rest } = deps;
    if (isGenerating) return;
    const lastAssistantIndex = findLastAssistantIndex(chatHistory);
    if (lastAssistantIndex === -1) return alert("Nothing to continue.");
    if (lastAssistantIndex !== chatHistory.length - 1) return alert("Continue works best after an assistant reply. Generate or reroll the next reply first.");
    const committed = commitLastAssistantChoice(chatHistory);
    await gen({
      ...rest, chatHistory,
      visibleHistory: [...committed, { role: "assistant", content: "Thinking..." }],
      promptHistory: committed,
      privateInstruction: "Continue directly from your previous assistant reply. Add the next natural part of the same reply or scene beat. Do not restart the scene. Do not summarize. Do not speak for the user. Do not ask for the user's next move.",
      finalBuilder: (reply) => appendGeneratedReplyToLastAssistant(committed, reply)
    });
  }

  async function elaborateLastReply(deps) {
    const { chatHistory, isGenerating, generateAssistantReply: gen, ...rest } = deps;
    if (isGenerating) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return alert("The last message is not an assistant reply.");
    const originalReply = getMessageDisplayText(lastMessage);
    const historyWithoutLastAssistant = chatHistory.slice(0, -1);
    await gen({
      ...rest,
      visibleHistory: [...historyWithoutLastAssistant, { role: "assistant", content: "Thinking..." }],
      promptHistory: historyWithoutLastAssistant,
      privateInstruction: `Rewrite the previous assistant reply as a richer version with more sensory detail, emotion, atmosphere, and in-character nuance. Preserve the same basic intent and scene direction. Do not make the reply wildly longer than needed. Do not speak for the user. Return only the revised in-world reply.\n\nPrevious assistant reply:\n"""${originalReply}"""`,
      finalBuilder: (reply) => addAlternativeToLastAssistant(chatHistory, reply)
    });
  }

  async function rerollLastReply(deps) {
    const { chatHistory, isGenerating, generateAssistantReply: gen, ...rest } = deps;
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to reroll.");
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return alert("The last message is not an assistant reply.");
    const historyWithoutLastAssistant = chatHistory.slice(0, -1);
    await gen({
      ...rest,
      visibleHistory: [...historyWithoutLastAssistant, { role: "assistant", content: "Thinking..." }],
      promptHistory: historyWithoutLastAssistant,
      privateInstruction: "Generate a different in-character assistant reply for this point in the scene. Keep the same story context, but vary the wording, emotional beat, and immediate action. Do not mention rerolling.",
      finalBuilder: (reply) => addAlternativeToLastAssistant(chatHistory, reply)
    });
  }

  async function regenerateFromMessage(deps) {
    const { chatHistory, isGenerating, activeStoryId, generateAssistantReply: gen, ...rest } = deps;
    const index = deps.index;
    if (isGenerating) return;
    const targetMessage = chatHistory[index];
    if (!targetMessage) return;
    if (index <= 0 && targetMessage.role === "assistant") { alert("The opening message cannot be regenerated from here."); return; }
    let keepCount = index + 1;
    let instruction = "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.";
    if (targetMessage.role === "assistant") {
      keepCount = index;
      instruction = "Regenerate the assistant reply at this point in the scene. Write a fresh in-character continuation based only on the story context and the chat before this message. Do not mention regeneration.";
    }
    const baseHistory = commitLastAssistantChoice(chatHistory).slice(0, keepCount);
    deps.repository.chats.save(activeStoryId, baseHistory);
    await gen({
      ...rest,
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory, privateInstruction: instruction,
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)]
    });
  }

  function rollbackLastExchange({ chatHistory, isGenerating, saveChatForActiveStory, setChatHistory }) {
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to rollback.");
    const nextHistory = [...chatHistory];
    const last = nextHistory[nextHistory.length - 1];
    const previous = nextHistory[nextHistory.length - 2];
    if (last?.role === "assistant" && previous?.role === "user") nextHistory.splice(nextHistory.length - 2, 2);
    else nextHistory.pop();
    setChatHistory(nextHistory); saveChatForActiveStory(nextHistory);
  }

  function resetChat({ isGenerating, resetCurrentStoryState }) {
    if (isGenerating) return;
    if (!confirm("Reset this story's chat back to its opening message?")) return;
    resetCurrentStoryState();
  }

  function startEditingMessage({ isGenerating, index, setEditingMessageIndex }) {
    if (isGenerating) return; setEditingMessageIndex(index);
  }

  function cancelMessageEdit({ setEditingMessageIndex }) { setEditingMessageIndex(null); }

  async function saveMessageEdit(deps) {
    const { chatHistory, isGenerating, activeStoryId, generateAssistantReply: gen, repository: repo, ...rest } = deps;
    const { index, newText, regenerateAfterSave = false } = deps;
    if (isGenerating) return;
    const trimmed = newText.trim();
    if (!trimmed) return alert("Message cannot be empty.");
    const nextHistory = chatHistory.map((message, messageIndex) => {
      if (messageIndex !== index) return message;
      if (isAssistantMessageWithOptions(message)) {
        const alternatives = [...message.alternatives]; alternatives[message.selectedIndex] = trimmed;
        return { ...message, alternatives, content: trimmed };
      }
      return { ...message, content: trimmed };
    });
    rest.setEditingMessageIndex(null); rest.setChatHistory(nextHistory);
    repo.chats.save(activeStoryId, nextHistory);
    if (regenerateAfterSave && nextHistory[index]?.role === "user") {
      const baseHistory = nextHistory.slice(0, index + 1);
      await gen({
        ...rest, activeStoryId,
        visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
        promptHistory: baseHistory,
        privateInstruction: "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.",
        finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)]
      });
    }
  }

  function deleteMessagesFromIndex({ index, isGenerating, activeStoryId, repository: repo, ...rest }) {
    if (isGenerating) return;
    if (index <= 0) return alert("The opening message cannot be deleted from here.");
    if (!confirm("Delete this message and everything after it?")) return;
    const nextHistory = rest.chatHistory.slice(0, index);
    rest.setEditingMessageIndex(null); rest.setChatHistory(nextHistory);
    repo.chats.save(activeStoryId, nextHistory);
  }

  function selectAssistantOption({ chatHistory, activeStoryId, repository: repo, setChatHistory, saveChatForActiveStory, messageIndex, optionIndex }) {
    const nextHistory = chatHistory.map((message, index) => {
      if (index !== messageIndex || !isAssistantMessageWithOptions(message)) return message;
      const selectedText = message.alternatives[optionIndex] || message.content || "";
      return { ...message, selectedIndex: optionIndex, content: selectedText };
    });
    setChatHistory(nextHistory); saveChatForActiveStory(nextHistory);
  }

  return {
    sendMessage, continueLastReply, elaborateLastReply, rerollLastReply,
    regenerateFromMessage, rollbackLastExchange, resetChat,
    startEditingMessage, cancelMessageEdit, saveMessageEdit,
    deleteMessagesFromIndex, selectAssistantOption,
  };
}
