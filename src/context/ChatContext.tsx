import { useApp } from "./AppContext";

// ChatContext provides chat history, editing state, and all chat operations.

export function useChatContext() {
  const app = useApp();
  return {
    chatHistory: app.chatHistory,
    editingMessageIndex: app.editingMessageIndex,
    sendMessage: app.sendMessage,
    continueLastReply: app.continueLastReply,
    elaborateLastReply: app.elaborateLastReply,
    rerollLastReply: app.rerollLastReply,
    rollbackLastExchange: app.rollbackLastExchange,
    resetChat: app.resetChat,
    startEditingMessage: app.startEditingMessage,
    cancelMessageEdit: app.cancelMessageEdit,
    saveMessageEdit: app.saveMessageEdit,
    deleteMessagesFromIndex: app.deleteMessagesFromIndex,
    regenerateFromMessage: app.regenerateFromMessage,
    selectAssistantOption: app.selectAssistantOption,
  };
}
