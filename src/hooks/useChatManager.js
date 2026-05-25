// useChatManager.js
// Hook that manages chat history, message editing, and all chat operations.
// Extracted from App.jsx.
//
// State managed:
//   chatHistory[], editingMessageIndex
//
// Actions:
//   sendMessage, continueLastReply, elaborateLastReply, rerollLastReply
//   rollbackLastExchange, resetChat
//   startEditingMessage, cancelMessageEdit, saveMessageEdit
//   deleteMessagesFromIndex, regenerateFromMessage
//   selectAssistantOption, commitLastAssistantChoice
//
// Depends on: useGeneration (for generateAssistantReply)
// Depends on: repository (for chat persistence)
